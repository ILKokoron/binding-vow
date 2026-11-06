//! Binding Vow: a self-commitment protocol on NEAR (testnet).
//!
//! A user locks a stake on their own promise. The promise plus the claim on
//! the stake is minted as a non-transferable NFT. A fixed set of judge
//! agents first fixes the proof terms (off-chain notary step; the agreed
//! terms are stored in the vow), then votes commit-reveal on whether the
//! submitted proof matches those terms.
//!
//! - Pass: the owner burns the NFT to redeem the full stake.
//! - Fail or no proof by the deadline: anyone can execute; the NFT is
//!   burned and the stake is forfeited to a destination the user picked
//!   before sealing (a named account, or the burn implicit address).
//! - Judges are paid from a SEPARATE verification fee, split among the
//!   judges who revealed, whatever the verdict. The stake never pays
//!   the judges. If no proof is ever submitted, no judging happened and
//!   the fee is refunded to the owner on execution.

use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::json_types::U128;
use near_sdk::serde::{Deserialize, Serialize};
use near_sdk::store::IterableMap;
use near_sdk::{env, near, AccountId, NearToken, PanicOnDefault, Promise};
use schemars::JsonSchema;

pub const MIN_STAKE_YOCTO: u128 = 10_000_000_000_000_000_000_000; // 0.01 NEAR
pub const MIN_FEE_YOCTO: u128 = 10_000_000_000_000_000_000_000; // 0.01 NEAR
pub const BURN_ADDRESS: &str =
    "0000000000000000000000000000000000000000000000000000000000000000";

#[derive(BorshSerialize, BorshDeserialize, Clone, Copy, PartialEq, Debug)]
pub enum Status {
    Active,
    Judging,
    Passed,
    Failed,
    Redeemed,
    Executed,
    Cancelled,
}

pub fn status_str(s: Status) -> &'static str {
    match s {
        Status::Active => "active",
        Status::Judging => "judging",
        Status::Passed => "passed",
        Status::Failed => "failed",
        Status::Redeemed => "redeemed",
        Status::Executed => "executed",
        Status::Cancelled => "cancelled",
    }
}

#[derive(BorshSerialize, BorshDeserialize)]
pub struct Vow {
    pub owner: AccountId,
    pub task: String,
    pub proof_terms: String,
    pub created_ns: u64,
    pub deadline_ns: u64,
    pub judging_window_secs: u64,
    pub cancel_window_secs: u64,
    pub stake: u128,
    pub fee: u128,
    pub forfeit_to: Option<AccountId>,
    pub status: Status,
    pub proof_uri: Option<String>,
    pub proof_hash: Option<String>,
    pub commits: Vec<(AccountId, String)>,
    pub reveals: Vec<(AccountId, bool)>,
    pub fee_settled: bool,
    pub burned: bool,
}

#[derive(Serialize, Deserialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct VowView {
    pub token_id: String,
    pub owner: String,
    pub task: String,
    pub proof_terms: String,
    pub created_ns: u64,
    pub deadline_ns: u64,
    pub judging_window_secs: u64,
    pub cancel_window_secs: u64,
    pub stake: String,
    pub fee: String,
    pub forfeit_to: Option<String>,
    pub status: String,
    pub proof_uri: Option<String>,
    pub proof_hash: Option<String>,
    pub commits_count: u64,
    pub reveals: Vec<(String, bool)>,
    pub fee_settled: bool,
    pub burned: bool,
}

#[derive(Serialize, Deserialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct TokenMetadataView {
    pub title: Option<String>,
    pub description: Option<String>,
    pub issued_at: Option<String>,
    pub extra: Option<String>,
}

#[derive(Serialize, Deserialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct JsonToken {
    pub token_id: String,
    pub owner_id: String,
    pub metadata: TokenMetadataView,
}

#[derive(Serialize, Deserialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct NftMetadataView {
    pub spec: String,
    pub name: String,
    pub symbol: String,
    pub icon: Option<String>,
    pub base_uri: Option<String>,
    pub reference: Option<String>,
    pub reference_hash: Option<String>,
}

pub fn compute_commitment(approve: bool, salt: &str) -> String {
    let raw = format!("{}:{}", approve, salt);
    let hash = env::sha256(raw.as_bytes());
    let mut out = String::with_capacity(hash.len() * 2);
    for b in hash.iter() {
        out.push_str(&format!("{:02x}", b));
    }
    out
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
    pub owner: AccountId,
    pub judges: Vec<AccountId>,
    pub vows: IterableMap<String, Vow>,
    pub next_id: u64,
    pub live_supply: u64,
}

#[near]
impl Contract {
    #[init]
    pub fn new(owner: AccountId, judges: Vec<AccountId>) -> Self {
        assert!(!judges.is_empty(), "at least one judge is required");
        Self {
            owner,
            judges,
            vows: IterableMap::new(b"v"),
            next_id: 0,
            live_supply: 0,
        }
    }

    pub fn judges(&self) -> Vec<String> {
        self.judges.iter().map(|j| j.to_string()).collect()
    }

    // ---------------- vow lifecycle ----------------

    #[payable]
    pub fn create_vow(
        &mut self,
        task: String,
        proof_terms: String,
        duration_secs: u64,
        judging_window_secs: u64,
        cancel_window_secs: u64,
        stake: U128,
        fee: U128,
        forfeit_to: Option<AccountId>,
    ) -> String {
        let stake: u128 = stake.into();
        let fee: u128 = fee.into();
        assert!(stake >= MIN_STAKE_YOCTO, "stake below minimum");
        assert!(fee >= MIN_FEE_YOCTO, "fee below minimum");
        assert!(duration_secs > 0, "duration must be positive");
        assert!(judging_window_secs > 0, "judging window must be positive");
        let attached = env::attached_deposit().as_yoctonear();
        assert_eq!(
            attached,
            stake + fee,
            "attached deposit must equal stake + fee exactly"
        );
        let now = env::block_timestamp();
        let token_id = format!("vow-{}", self.next_id);
        self.next_id += 1;
        self.live_supply += 1;
        let vow = Vow {
            owner: env::predecessor_account_id(),
            task,
            proof_terms,
            created_ns: now,
            deadline_ns: now + duration_secs * 1_000_000_000,
            judging_window_secs,
            cancel_window_secs,
            stake,
            fee,
            forfeit_to,
            status: Status::Active,
            proof_uri: None,
            proof_hash: None,
            commits: Vec::new(),
            reveals: Vec::new(),
            fee_settled: false,
            burned: false,
        };
        env::log_str(&format!("VOW_CREATED {} by {}", token_id, vow.owner));
        self.vows.insert(token_id.clone(), vow);
        token_id
    }

    /// The mercy window: while the vow is still Active and the cancel
    /// window chosen at creation has not closed, the owner can cancel
    /// and gets the stake AND the fee back in full; the NFT is burned.
    /// Submitting proof seals the vow early: no cancel after that.
    pub fn cancel_vow(&mut self, token_id: String) {
        let (owner, refund) = {
            let vow = self.vows.get_mut(&token_id).expect("vow not found");
            assert_eq!(vow.owner, env::predecessor_account_id(), "only the vow owner");
            assert!(matches!(vow.status, Status::Active), "vow is already sealed");
            assert!(
                env::block_timestamp()
                    <= vow.created_ns + vow.cancel_window_secs * 1_000_000_000,
                "cancellation window has closed"
            );
            assert!(!vow.burned, "already burned");
            vow.burned = true;
            vow.status = Status::Cancelled;
            (vow.owner.clone(), vow.stake + vow.fee)
        };
        self.live_supply -= 1;
        Promise::new(owner).transfer(NearToken::from_yoctonear(refund));
        env::log_str(&format!("VOW_CANCELLED {}", token_id));
    }

    pub fn submit_proof(&mut self, token_id: String, proof_uri: String, proof_hash: String) {
        let vow = self.vows.get_mut(&token_id).expect("vow not found");
        assert_eq!(vow.owner, env::predecessor_account_id(), "only the vow owner");
        assert!(matches!(vow.status, Status::Active), "vow is not active");
        assert!(
            env::block_timestamp() <= vow.deadline_ns,
            "deadline has passed"
        );
        vow.proof_uri = Some(proof_uri);
        vow.proof_hash = Some(proof_hash);
        vow.status = Status::Judging;
        env::log_str(&format!("PROOF_SUBMITTED {}", token_id));
    }

    pub fn commit_vote(&mut self, token_id: String, commitment: String) {
        let caller = env::predecessor_account_id();
        assert!(self.judges.contains(&caller), "only judges may vote");
        let vow = self.vows.get_mut(&token_id).expect("vow not found");
        assert!(matches!(vow.status, Status::Judging), "vow is not judging");
        assert!(
            !vow.commits.iter().any(|(j, _)| *j == caller),
            "already committed"
        );
        vow.commits.push((caller, commitment));
    }

    pub fn reveal_vote(&mut self, token_id: String, approve: bool, salt: String) {
        let caller = env::predecessor_account_id();
        assert!(self.judges.contains(&caller), "only judges may vote");
        let vow = self.vows.get_mut(&token_id).expect("vow not found");
        assert!(matches!(vow.status, Status::Judging), "vow is not judging");
        let (_, commitment) = vow
            .commits
            .iter()
            .find(|(j, _)| *j == caller)
            .expect("no commitment found for this judge")
            .clone();
        assert_eq!(
            commitment,
            compute_commitment(approve, &salt),
            "reveal does not match commitment"
        );
        assert!(
            !vow.reveals.iter().any(|(j, _)| *j == caller),
            "already revealed"
        );
        vow.reveals.push((caller, approve));
    }

    pub fn finalize(&mut self, token_id: String) {
        let (status, payouts, refund) = {
            let vow = self.vows.get_mut(&token_id).expect("vow not found");
            assert!(matches!(vow.status, Status::Judging), "vow is not judging");
            let all_revealed = vow.reveals.len() >= self.judges.len();
            let window_over = env::block_timestamp()
                > vow.deadline_ns + vow.judging_window_secs * 1_000_000_000;
            assert!(
                all_revealed || window_over,
                "judging is still in progress"
            );
            if vow.reveals.is_empty() {
                // No judge did any work: verdict fails, fee goes back.
                vow.status = Status::Failed;
                vow.fee_settled = true;
                (Status::Failed, Vec::new(), Some((vow.owner.clone(), vow.fee)))
            } else {
                let approvals = vow.reveals.iter().filter(|(_, a)| *a).count();
                let passed = approvals * 2 > vow.reveals.len();
                let share = vow.fee / vow.reveals.len() as u128;
                let mut payouts: Vec<(AccountId, u128)> = vow
                    .reveals
                    .iter()
                    .map(|(j, _)| (j.clone(), share))
                    .collect();
                let remainder = vow.fee - share * vow.reveals.len() as u128;
                if remainder > 0 {
                    payouts[0].1 += remainder;
                }
                vow.status = if passed { Status::Passed } else { Status::Failed };
                vow.fee_settled = true;
                (vow.status, payouts, None)
            }
        };
        for (judge, amount) in payouts {
            if amount > 0 {
                Promise::new(judge).transfer(NearToken::from_yoctonear(amount));
            }
        }
        if let Some((owner, amount)) = refund {
            Promise::new(owner).transfer(NearToken::from_yoctonear(amount));
        }
        env::log_str(&format!("VOW_FINALIZED {} -> {}", token_id, status_str(status)));
    }

    pub fn redeem(&mut self, token_id: String) {
        let (owner, stake) = {
            let vow = self.vows.get_mut(&token_id).expect("vow not found");
            assert_eq!(vow.owner, env::predecessor_account_id(), "only the vow owner");
            assert!(matches!(vow.status, Status::Passed), "vow has not passed");
            assert!(!vow.burned, "already burned");
            vow.burned = true;
            vow.status = Status::Redeemed;
            (vow.owner.clone(), vow.stake)
        };
        self.live_supply -= 1;
        Promise::new(owner).transfer(NearToken::from_yoctonear(stake));
        env::log_str(&format!("VOW_REDEEMED {}", token_id));
    }

    pub fn execute(&mut self, token_id: String) {
        let (owner, stake, fee_refund, forfeit_to) = {
            let vow = self.vows.get_mut(&token_id).expect("vow not found");
            let no_proof_timeout = matches!(vow.status, Status::Active)
                && env::block_timestamp() > vow.deadline_ns;
            let failed = matches!(vow.status, Status::Failed);
            assert!(failed || no_proof_timeout, "vow cannot be executed yet");
            assert!(!vow.burned, "already burned");
            let fee_refund = if no_proof_timeout && !vow.fee_settled {
                vow.fee_settled = true;
                Some(vow.fee)
            } else {
                None
            };
            vow.burned = true;
            vow.status = Status::Executed;
            (
                vow.owner.clone(),
                vow.stake,
                fee_refund,
                vow.forfeit_to.clone(),
            )
        };
        self.live_supply -= 1;
        let destination: AccountId = match forfeit_to {
            Some(acct) => acct,
            None => BURN_ADDRESS.parse().unwrap(),
        };
        Promise::new(destination).transfer(NearToken::from_yoctonear(stake));
        if let Some(fee) = fee_refund {
            Promise::new(owner).transfer(NearToken::from_yoctonear(fee));
        }
        env::log_str(&format!("VOW_EXECUTED {}", token_id));
    }

    // ---------------- views ----------------

    pub fn get_vow(&self, token_id: String) -> Option<VowView> {
        self.vows.get(&token_id).map(|v| VowView {
            token_id,
            owner: v.owner.to_string(),
            task: v.task.clone(),
            proof_terms: v.proof_terms.clone(),
            created_ns: v.created_ns,
            deadline_ns: v.deadline_ns,
            judging_window_secs: v.judging_window_secs,
            cancel_window_secs: v.cancel_window_secs,
            stake: v.stake.to_string(),
            fee: v.fee.to_string(),
            forfeit_to: v.forfeit_to.as_ref().map(|a| a.to_string()),
            status: status_str(v.status).to_string(),
            proof_uri: v.proof_uri.clone(),
            proof_hash: v.proof_hash.clone(),
            commits_count: v.commits.len() as u64,
            reveals: v
                .reveals
                .iter()
                .map(|(j, a)| (j.to_string(), *a))
                .collect(),
            fee_settled: v.fee_settled,
            burned: v.burned,
        })
    }

    pub fn nft_metadata(&self) -> NftMetadataView {
        NftMetadataView {
            spec: "nft-1.0.0".to_string(),
            name: "Binding Vow".to_string(),
            symbol: "VOW".to_string(),
            icon: None,
            base_uri: None,
            reference: None,
            reference_hash: None,
        }
    }

    fn token_view(&self, token_id: &String, v: &Vow) -> JsonToken {
        JsonToken {
            token_id: token_id.clone(),
            owner_id: v.owner.to_string(),
            metadata: TokenMetadataView {
                title: Some(v.task.clone()),
                description: Some(v.proof_terms.clone()),
                issued_at: Some(v.created_ns.to_string()),
                extra: Some(status_str(v.status).to_string()),
            },
        }
    }

    pub fn nft_token(&self, token_id: String) -> Option<JsonToken> {
        match self.vows.get(&token_id) {
            Some(v) if !v.burned => Some(self.token_view(&token_id, v)),
            _ => None,
        }
    }

    pub fn nft_total_supply(&self) -> U128 {
        U128(self.live_supply as u128)
    }

    pub fn nft_supply_for_owner(&self, account_id: AccountId) -> U128 {
        let count = self
            .vows
            .iter()
            .filter(|(_, v)| v.owner == account_id && !v.burned)
            .count();
        U128(count as u128)
    }

    pub fn nft_tokens_for_owner(
        &self,
        account_id: AccountId,
        from_index: Option<U128>,
        limit: Option<u64>,
    ) -> Vec<JsonToken> {
        let start: u128 = from_index.map(|i| i.into()).unwrap_or(0);
        let limit: u64 = limit.unwrap_or(50);
        self.vows
            .iter()
            .filter(|(_, v)| v.owner == account_id && !v.burned)
            .skip(start as usize)
            .take(limit as usize)
            .map(|(id, v)| self.token_view(id, v))
            .collect()
    }

    // ---------------- soulbound ----------------

    #[payable]
    pub fn nft_transfer(
        &mut self,
        receiver_id: AccountId,
        token_id: String,
        approval_id: Option<u64>,
        memo: Option<String>,
    ) {
        let _ = (receiver_id, token_id, approval_id, memo);
        assert_eq!(
            env::attached_deposit().as_yoctonear(),
            1,
            "Requires attached deposit of exactly 1 yoctoNEAR"
        );
        env::panic_str("Binding Vow NFTs are non-transferable");
    }

    #[payable]
    pub fn nft_transfer_call(
        &mut self,
        receiver_id: AccountId,
        token_id: String,
        approval_id: Option<u64>,
        memo: Option<String>,
        msg: String,
    ) {
        let _ = (receiver_id, token_id, approval_id, memo, msg);
        assert_eq!(
            env::attached_deposit().as_yoctonear(),
            1,
            "Requires attached deposit of exactly 1 yoctoNEAR"
        );
        env::panic_str("Binding Vow NFTs are non-transferable");
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::{accounts, VMContextBuilder};
    use near_sdk::testing_env;

    const NEAR: u128 = 1_000_000_000_000_000_000_000_000;
    const SEC: u64 = 1_000_000_000;

    fn ctx(account: AccountId, deposit: u128, ts: u64) -> VMContextBuilder {
        let mut builder = VMContextBuilder::new();
        builder
            .current_account_id(accounts(0))
            .signer_account_id(account.clone())
            .predecessor_account_id(account)
            .attached_deposit(NearToken::from_yoctonear(deposit))
            .block_timestamp(ts);
        builder
    }

    fn setup() -> Contract {
        testing_env!(ctx(accounts(0), 0, SEC).build());
        Contract::new(
            accounts(0),
            vec![accounts(1), accounts(2), accounts(3)],
        )
    }

    fn make_vow(c: &mut Contract) -> String {
        testing_env!(ctx(accounts(5), NEAR + NEAR * 3 / 10, SEC).build());
        c.create_vow(
            "Ship the demo".to_string(),
            "Repo link live and demo video uploaded".to_string(),
            100,
            50,
            10,
            U128(NEAR),
            U128(NEAR * 3 / 10),
            None,
        )
    }

    fn judge_vote(c: &mut Contract, token: &String, judge: AccountId, approve: bool, ts: u64) {
        let salt = format!("salt-{}", judge);
        testing_env!(ctx(judge.clone(), 0, ts).build());
        c.commit_vote(token.clone(), compute_commitment(approve, &salt));
        c.reveal_vote(token.clone(), approve, salt);
    }

    #[test]
    fn create_vow_mints_soulbound_token() {
        let mut c = setup();
        let token = make_vow(&mut c);
        assert_eq!(token, "vow-0");
        assert_eq!(c.nft_total_supply(), U128(1));
        assert_eq!(c.nft_supply_for_owner(accounts(5)), U128(1));
        let t = c.nft_token(token.clone()).expect("token must exist");
        assert_eq!(t.owner_id, accounts(5).to_string());
        let v = c.get_vow(token).expect("vow view");
        assert_eq!(v.status, "active");
    }

    #[test]
    #[should_panic(expected = "attached deposit must equal stake + fee exactly")]
    fn create_vow_wrong_deposit_panics() {
        let mut c = setup();
        testing_env!(ctx(accounts(5), NEAR, SEC).build());
        c.create_vow(
            "x".to_string(),
            "y".to_string(),
            100,
            50,
            10,
            U128(NEAR),
            U128(NEAR * 3 / 10),
            None,
        );
    }

    #[test]
    fn pass_flow_redeems() {
        let mut c = setup();
        let token = make_vow(&mut c);
        testing_env!(ctx(accounts(5), 0, 2 * SEC).build());
        c.submit_proof(token.clone(), "https://example.org/demo".to_string(), "abc123".to_string());
        judge_vote(&mut c, &token, accounts(1), true, 3 * SEC);
        judge_vote(&mut c, &token, accounts(2), true, 3 * SEC);
        judge_vote(&mut c, &token, accounts(3), false, 3 * SEC);
        testing_env!(ctx(accounts(5), 0, 4 * SEC).build());
        c.finalize(token.clone());
        assert_eq!(c.get_vow(token.clone()).unwrap().status, "passed");
        assert!(c.get_vow(token.clone()).unwrap().fee_settled);
        c.redeem(token.clone());
        let v = c.get_vow(token.clone()).unwrap();
        assert_eq!(v.status, "redeemed");
        assert!(v.burned);
        assert!(c.nft_token(token).is_none());
        assert_eq!(c.nft_total_supply(), U128(0));
    }

    #[test]
    fn fail_flow_executes() {
        let mut c = setup();
        let token = make_vow(&mut c);
        testing_env!(ctx(accounts(5), 0, 2 * SEC).build());
        c.submit_proof(token.clone(), "https://example.org/demo".to_string(), "abc123".to_string());
        judge_vote(&mut c, &token, accounts(1), false, 3 * SEC);
        judge_vote(&mut c, &token, accounts(2), false, 3 * SEC);
        judge_vote(&mut c, &token, accounts(3), true, 3 * SEC);
        testing_env!(ctx(accounts(1), 0, 4 * SEC).build());
        c.finalize(token.clone());
        assert_eq!(c.get_vow(token.clone()).unwrap().status, "failed");
        c.execute(token.clone());
        let v = c.get_vow(token).unwrap();
        assert_eq!(v.status, "executed");
        assert!(v.burned);
        assert_eq!(c.nft_total_supply(), U128(0));
    }

    #[test]
    fn no_proof_timeout_executes() {
        let mut c = setup();
        let token = make_vow(&mut c);
        testing_env!(ctx(accounts(1), 0, 200 * SEC).build());
        c.execute(token.clone());
        let v = c.get_vow(token).unwrap();
        assert_eq!(v.status, "executed");
    }

    #[test]
    #[should_panic(expected = "deadline has passed")]
    fn late_proof_panics() {
        let mut c = setup();
        let token = make_vow(&mut c);
        testing_env!(ctx(accounts(5), 0, 200 * SEC).build());
        c.submit_proof(token, "https://example.org".to_string(), "x".to_string());
    }

    #[test]
    #[should_panic(expected = "only judges may vote")]
    fn non_judge_cannot_vote() {
        let mut c = setup();
        let token = make_vow(&mut c);
        testing_env!(ctx(accounts(5), 0, 2 * SEC).build());
        c.submit_proof(token.clone(), "https://example.org".to_string(), "x".to_string());
        testing_env!(ctx(accounts(4), 0, 3 * SEC).build());
        c.commit_vote(token, "whatever".to_string());
    }

    #[test]
    #[should_panic(expected = "reveal does not match commitment")]
    fn reveal_mismatch_panics() {
        let mut c = setup();
        let token = make_vow(&mut c);
        testing_env!(ctx(accounts(5), 0, 2 * SEC).build());
        c.submit_proof(token.clone(), "https://example.org".to_string(), "x".to_string());
        testing_env!(ctx(accounts(1), 0, 3 * SEC).build());
        c.commit_vote(token.clone(), compute_commitment(true, "real-salt"));
        c.reveal_vote(token, true, "wrong-salt".to_string());
    }

    #[test]
    fn cancel_inside_window_refunds_and_burns() {
        let mut c = setup();
        let token = make_vow(&mut c);
        testing_env!(ctx(accounts(5), 0, 2 * SEC).build());
        c.cancel_vow(token.clone());
        let v = c.get_vow(token.clone()).unwrap();
        assert_eq!(v.status, "cancelled");
        assert!(v.burned);
        assert!(c.nft_token(token).is_none());
        assert_eq!(c.nft_total_supply(), U128(0));
    }

    #[test]
    #[should_panic(expected = "cancellation window has closed")]
    fn cancel_after_window_panics() {
        let mut c = setup();
        let token = make_vow(&mut c);
        testing_env!(ctx(accounts(5), 0, 12 * SEC).build());
        c.cancel_vow(token);
    }

    #[test]
    #[should_panic(expected = "vow is already sealed")]
    fn cancel_after_proof_panics() {
        let mut c = setup();
        let token = make_vow(&mut c);
        testing_env!(ctx(accounts(5), 0, 2 * SEC).build());
        c.submit_proof(token.clone(), "https://example.org".to_string(), "x".to_string());
        c.cancel_vow(token);
    }

    #[test]
    #[should_panic(expected = "Binding Vow NFTs are non-transferable")]
    fn transfer_panics() {
        let mut c = setup();
        let token = make_vow(&mut c);
        testing_env!(ctx(accounts(5), 1, 2 * SEC).build());
        c.nft_transfer(accounts(1), token, None, None);
    }
}
