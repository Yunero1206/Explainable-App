# Authoritative web retrieval contract

Tavily Search is a retrieval mechanism, not a source. Gemini is an analyst, not an authority. Only a direct publisher with authority over the specific public claim can be admitted as evidence.

## Decision flow

1. The user explicitly selects **Analysis only** or **Web-assisted** for the Model Run. No keyword or regular expression silently changes modes.
2. In Web-assisted mode, Gemini processes the current user statement and the actual uploaded text, PDF, and image contents before planning retrieval.
3. Plan only public information needs that materially block the user intent. If none remain, record `no_public_need` and do not call Tavily.
4. Route case-specific, private, transaction-specific, identity-specific, account-specific, and physical-object questions to a Gap and Action for direct confirmation or user upload. They are never web-search questions.
5. Send Tavily Search only a server-validated public query and official-domain filters. Never send the raw case, user files, person names, contact details, private document text, unique transaction details, or account/order/invoice/case identifiers to Tavily.
6. The fixed Tavily request uses Basic Search with automatic parameters, generated answers, raw content, and images disabled. The Model Run records provider request IDs and reported credits.
7. Admit a result only when all of these are true:
   - the exact direct URL was returned by Tavily for this request;
   - the URL is HTTPS and is not a search/redirect URL;
   - the host matches a planned official domain and the named organization's first-party domain or a responsible public-authority domain;
   - the source class is not social, forum, media, blog, aggregator, search snippet, or AI answer;
   - the excerpt has a bounded authority scope for the exact public claim.
8. Allocate the canonical `[E]` ID in application code, attach web provenance, and create a server-owned inspection. Gemini cannot allocate or inspect the web evidence.
9. Let the proposal analyzer use the admitted `[E]` only within its authority scope. A public policy or published price cannot establish a private account state, a transaction outcome, a physical object's authenticity/value, case eligibility, or future completion.
10. If no source passes admission, fail closed: keep the decision-relevant Gap and recommend direct official confirmation or upload. Never answer the current-policy question from model memory.

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

The model-run audit records the selected mode, retrieval provider/product, status, planned and executed public queries, admitted evidence IDs, provider request IDs, reported credits, and rejection reason codes. Rejected result URLs are not persisted. The trace distinguishes `not_requested`, `no_public_need`, `completed`, `no_authoritative_source`, `blocked`, and `provider_error`. Older ledgers and audits remain readable because the new provenance and trace fields are additive.

## Citation behavior

Selecting a web `[E]` opens an in-app citation panel containing the excerpt and provenance. The source URL is displayed and copyable. The app does not automatically navigate to, embed, or open the webpage.
