# Authoritative web retrieval contract

Google Search is a retrieval mechanism, not a source. Gemini is an analyst, not an authority. Only a direct publisher with authority over the specific public claim can be admitted as evidence.

## Decision flow

1. Process the current user statement and uploaded files first.
2. Open the web-retrieval gate only when the current user message explicitly asks to search or look up the Internet/web.
3. Plan only public information needs that materially block the user intent.
4. Route case-specific, private, transaction-specific, identity-specific, account-specific, and physical-object questions to a Gap and Action for direct confirmation or user upload. They are never web-search questions.
5. Send Google Search only a server-validated public query and authority target. Never send the raw case, user files, person/contact details, or unique account/order/invoice/case identifiers to Search.
6. Admit a result only when all of these are true:
   - the URL was returned in Google Search grounding metadata;
   - the URL is direct HTTPS and is not a search/redirect URL;
   - the host is the named organization's first-party domain or a responsible public-authority domain;
   - the source class is not social, forum, media, blog, aggregator, search snippet, or AI answer;
   - the excerpt has a bounded authority scope for the exact public claim.
7. Allocate the canonical `[E]` ID in application code, attach web provenance, and create a server-owned inspection. Gemini cannot allocate or inspect the web evidence.
8. Let the proposal analyzer use the admitted `[E]` only within its authority scope. A public policy or published price cannot establish a private account state, a transaction outcome, a physical object's authenticity/value, case eligibility, or future completion.
9. If no source passes admission, fail closed: keep the decision-relevant Gap and recommend direct official confirmation or upload. Never answer the current-policy question from model memory.

## Source routing

| Claim | Admissible authority | Not sufficient |
| --- | --- | --- |
| Company policy, published price, listed branch/hours | Company's direct first-party website | Customer comments, media, forums, official social posts |
| Law, rule, registry record | Responsible regulator, government body, or registry | Company blog, media summary, AI answer |
| User intent, target, deadline, account of events | User statement `[U]` | Public web source |
| Case-specific account or transaction outcome | Direct response/record from the responsible organization supplied by the user | General policy page |
| Physical object attributes or actual offer | Inspection, certification, or direct quotation supplied by the user | Published commodity price or general buyback policy |

Official social channels may be useful as a lead in a different research product, but they are deliberately non-admissible here and cannot close a Gap.

## Canonical web evidence

An admitted source uses:

- `acquisition_method: authoritative_web_retrieval`
- `input_form: web_excerpt`
- preserved source excerpt in `content.raw_text`
- no blob and no model-created inspection
- `web_provenance` containing publisher, page title, direct URL, publication/update date when available, retrieval time, authority kind/entity/scope, and sanitized query

The model-run audit records the retrieval status, planned and executed public queries, admitted evidence IDs, and rejection reason codes. Rejected result URLs are not persisted. Older ledgers and audits remain readable because the new provenance and trace fields are additive.

## Citation behavior

Selecting a web `[E]` opens an in-app citation panel containing the excerpt and provenance. The source URL is displayed and copyable. The app does not automatically navigate to, embed, or open the webpage.
