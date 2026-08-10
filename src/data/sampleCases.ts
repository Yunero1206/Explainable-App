import { CaseData } from '../types';

export const SAMPLE_CASES: CaseData[] = [
  {
    id: 'case-sample-03',
    case_number: 'C-0003',
    title: 'Adobe subscription cancellation & early termination fee dispute',
    objective: 'Determine whether Adobe communicated early termination fee conditions upon plan signup and establish if cancellation was completed prior to billing renewal.',
    user_story: 'I signed up for an Adobe Creative Cloud All Apps subscription on March 15, 2026. On July 10, 2026, I attempted to cancel my plan via the online portal. The confirmation page showed my subscription was cancelled, but on August 1, 2026, I was charged a $140.00 Early Termination Fee. I contacted customer support, who stated that my annual plan paid monthly carries a 50% remaining contract fee if cancelled after 14 days. I checked my signup emails and portal screens, which did not clearly display an ETF condition during checkout.',
    statements: [
      {
        id: 'U01',
        text: 'I signed up for an Adobe Creative Cloud All Apps subscription on March 15, 2026. On July 10, 2026, I attempted to cancel my plan via the online portal. The confirmation page showed my subscription was cancelled, but on August 1, 2026, I was charged a $140.00 Early Termination Fee. I contacted customer support, who stated that my annual plan paid monthly carries a 50% remaining contract fee if cancelled after 14 days. I checked my signup emails and portal screens, which did not clearly display an ETF condition during checkout.',
        submitted_at: '2026-08-01T09:00:00.000Z',
        attachment_ids: ['E01', 'E02', 'E03', 'E04', 'E05', 'E06', 'E07', 'E08', 'E09'],
      },
    ],
    evidence: [
      {
        id: 'E01',
        label: 'Adobe Subscription Confirmation Email',
        claimed_source: 'Adobe Systems Inc.',
        acquisition_method: 'pasted_text',
        input_form: 'email_text',
        evidence_time: '2026-03-15 11:00',
        received_at: '2026-08-01',
        subject_object_ids: ['Plan: Creative Cloud All Apps', 'Account: ADB-77120'],
        content: 'From: message@adobe.com\nTo: user@designstudio.com\nSubject: Welcome to Adobe Creative Cloud\nThank you for subscribing to Creative Cloud All Apps ($54.99/mo). Your order #ADB-77120 is now active.',
        source_attribution: 'Attributed to message@adobe.com via user email paste.',
        case_object_match: 'Matches Account #ADB-77120.',
        case_object_match_status: 'matched',
        completeness_context: 'Pasted email text provided without raw email headers.',
        integrity_signals: 'Standard welcome email format.',
        corroborated_by: ['E02'],
        qualified_by: [],
        conflicted_by: [],
        limitations: ['Pasted body copy; email headers not verified.']
      },
      {
        id: 'E02',
        label: 'Initial Invoice #INV-AD-991',
        claimed_source: 'Adobe Billing',
        acquisition_method: 'user_upload',
        input_form: 'receipt',
        evidence_time: '2026-03-15 11:02',
        received_at: '2026-08-01',
        subject_object_ids: ['Invoice: #INV-AD-991'],
        content: 'Adobe Systems Invoice #INV-AD-991. Amount Paid: $54.99 USD. Line Item: Creative Cloud All Apps Plan - Annual, paid monthly.',
        source_attribution: 'PDF receipt from Adobe billing portal.',
        case_object_match: 'Matches plan name and price.',
        case_object_match_status: 'matched',
        completeness_context: 'Single page invoice PDF.',
        integrity_signals: 'Format appears consistent with standard PDF invoices.',
        corroborated_by: ['E01'],
        qualified_by: [],
        conflicted_by: [],
        limitations: ['Invoice confirms initial payment; does not reproduce full checkout terms modal.']
      },
      {
        id: 'E03',
        label: 'Adobe Account Portal Active Plan Screenshot',
        claimed_source: 'Adobe Web Portal',
        acquisition_method: 'user_upload',
        input_form: 'screenshot',
        evidence_time: '2026-07-10 11:15',
        received_at: '2026-07-10',
        subject_object_ids: ['Account: ADB-77120'],
        content: 'Screenshot of account.adobe.com showing "Plan: Creative Cloud All Apps - Annual (Paid Monthly). Status: Active. Billing Date: 15th of each month."',
        source_attribution: 'PNG screenshot of browser tab account.adobe.com.',
        case_object_match: 'Matches Account ADB-77120.',
        case_object_match_status: 'matched',
        completeness_context: 'Cropped browser screenshot.',
        integrity_signals: 'Consistent with Adobe dashboard UI elements.',
        corroborated_by: ['E04'],
        qualified_by: [],
        conflicted_by: [],
        limitations: ['Browser screenshot submitted by user.']
      },
      {
        id: 'E04',
        label: 'Online Plan Cancellation Confirmation Page Screenshot',
        claimed_source: 'Adobe Web Portal',
        acquisition_method: 'user_upload',
        input_form: 'screenshot',
        evidence_time: '2026-07-10 11:20',
        received_at: '2026-07-10',
        subject_object_ids: ['Account: ADB-77120'],
        content: 'Screenshot showing webpage confirmation dialog: "Your subscription to Creative Cloud All Apps has been cancelled. Access remains active until July 15, 2026. No further action needed."',
        source_attribution: 'PNG screenshot of cancellation confirmation screen.',
        case_object_match: 'Matches Account ADB-77120.',
        case_object_match_status: 'matched',
        completeness_context: 'Web page dialog capture.',
        integrity_signals: 'Format appears consistent with portal cancellation summary.',
        corroborated_by: ['E03'],
        qualified_by: [],
        conflicted_by: [],
        limitations: ['User PNG screenshot; confirms portal displayed cancellation text on July 10.']
      },
      {
        id: 'E05',
        label: 'Credit Card Statement Showing $140.00 ETF Charge',
        claimed_source: 'Bank Payment Card Statement',
        acquisition_method: 'user_upload',
        input_form: 'receipt',
        evidence_time: '2026-08-01',
        received_at: '2026-08-02',
        subject_object_ids: ['Transaction: ADOBE *EARLY TERM FEE'],
        content: 'Credit Card Statement excerpt: "2026-08-01 ADOBE *EARLY TERM FEE SAN JOSE CA - $140.00 USD (Pending/Posted)".',
        source_attribution: 'Official bank PDF statement.',
        case_object_match: 'Matches user credit card and $140 fee amount.',
        case_object_match_status: 'matched',
        completeness_context: 'Bank transaction line item.',
        integrity_signals: 'Bank PDF export format.',
        corroborated_by: ['E06'],
        qualified_by: [],
        conflicted_by: [],
        limitations: ['Confirms financial debit on Aug 1; does not prove backend policy legality.']
      },
      {
        id: 'E06',
        label: 'Adobe Customer Support Live Chat Transcript',
        claimed_source: 'Adobe Support Chat',
        acquisition_method: 'pasted_text',
        input_form: 'chat_transcript',
        evidence_time: '2026-08-02 14:30',
        received_at: '2026-08-02',
        subject_object_ids: ['Support Ticket #TKT-ADB-8810'],
        content: 'Agent (Rohan): "Hello. As per Section 3.4 of Adobe Terms of Use, cancelling an Annual plan paid monthly after the initial 14-day window incurs an Early Termination Fee equal to 50% of your remaining contract balance ($140.00)."',
        source_attribution: 'Pasted text transcript from help.adobe.com chat session.',
        case_object_match: 'References $140 charge and Ticket #TKT-ADB-8810.',
        case_object_match_status: 'matched',
        completeness_context: 'Pasted chat transcript.',
        integrity_signals: 'User copy of support chat.',
        corroborated_by: ['E05', 'E07'],
        qualified_by: [],
        conflicted_by: [],
        limitations: ['Establishes support agent communicated this explanation; does not verify backend server logs.']
      },
      {
        id: 'E07',
        label: 'Adobe Terms of Use Section 3.4 Excerpt PDF',
        claimed_source: 'Adobe Legal Terms Document',
        acquisition_method: 'user_upload',
        input_form: 'pdf',
        evidence_time: '2026-03-15',
        received_at: '2026-08-02',
        subject_object_ids: ['Terms of Use Section 3.4'],
        content: 'Adobe General Terms Section 3.4: "If you cancel an Annual Plan (Paid Monthly) after 14 days, you will be charged a lump sum equal to 50% of your remaining contract obligation."',
        source_attribution: 'Published Adobe legal terms PDF document.',
        case_object_match: 'Cites Section 3.4 referenced by chat agent in E06.',
        case_object_match_status: 'matched',
        completeness_context: 'Section excerpt.',
        integrity_signals: 'Standard legal terms document layout.',
        corroborated_by: ['E06'],
        qualified_by: [],
        conflicted_by: [],
        limitations: ['Establishes published clause exists; does not prove explicit affirmative consent was recorded during signup.']
      },
      {
        id: 'E08',
        label: 'User Signup Screen Capture Video Artifact',
        claimed_source: 'User Screen Recording',
        acquisition_method: 'user_upload',
        input_form: 'document',
        evidence_time: '2026-03-15 10:58',
        received_at: '2026-03-15',
        subject_object_ids: ['Checkout Session'],
        content: 'Short video screen recording of checkout showing order summary box with price "$54.99/mo". ETF fine print text appears inside collapsed tooltip dropdown not auto-expanded.',
        source_attribution: 'User local screen recording file.',
        case_object_match: 'Covers March 15 checkout interaction.',
        case_object_match_status: 'matched',
        completeness_context: 'Screen recording of browser window.',
        integrity_signals: 'User capture video artifact.',
        corroborated_by: ['E01'],
        qualified_by: [],
        conflicted_by: [],
        limitations: ['Recorded from client screen; demonstrates tooltip was collapsed by default during user checkout.']
      },
      {
        id: 'E09',
        label: 'Formal Support Ticket #TKT-ADB-8810 Rejection Email',
        claimed_source: 'Adobe Customer Support Escalations',
        acquisition_method: 'pasted_text',
        input_form: 'email_text',
        evidence_time: '2026-08-04 09:15',
        received_at: '2026-08-04',
        subject_object_ids: ['Ticket #TKT-ADB-8810'],
        content: 'From: support-escalations@adobe.com\nSubject: Final Determination - Case #TKT-ADB-8810\nDear Customer, We reviewed your request regarding the $140.00 Early Termination Fee. Because cancellation occurred in month 4 of a 12-month contract, the fee was correctly assessed according to our terms. Waiver request is denied.',
        source_attribution: 'Email text from support-escalations@adobe.com.',
        case_object_match: 'References Ticket #TKT-ADB-8810.',
        case_object_match_status: 'matched',
        completeness_context: 'Support response email body text.',
        integrity_signals: 'Official ticket resolution notice.',
        corroborated_by: ['E05', 'E06'],
        qualified_by: [],
        conflicted_by: [],
        limitations: ['Confirms Adobe official refusal to refund $140.00 fee.']
      }
    ],
    events: [
      {
        id: 'EV01',
        time: '2026-03-15 11:00',
        actor: 'Adobe Systems Inc.',
        action: 'confirmed annual plan subscription paid monthly for',
        target: 'Creative Cloud All Apps ($54.99/mo)',
        effect: 'subscription activated under Account #ADB-77120',
        evidence_ids: ['E01', 'E02'],
        user_statement_ids: ['U01'],
        assessment: 'Established within current record'
      },
      {
        id: 'EV02',
        time: '2026-07-10 11:20',
        actor: 'User',
        action: 'executed online plan cancellation request on',
        target: 'Adobe Account Portal',
        effect: 'cancellation confirmation page displayed [See evidence · E04]',
        evidence_ids: ['E03', 'E04'],
        user_statement_ids: ['U01'],
        assessment: 'Established within current record'
      },
      {
        id: 'EV03',
        time: '2026-08-01',
        actor: 'Adobe Billing',
        action: 'posted $140.00 Early Termination Fee charge on',
        target: 'User Credit Card Statement',
        effect: 'fee transaction processed [See evidence · E05]',
        evidence_ids: ['E05'],
        user_statement_ids: ['U01'],
        assessment: 'Established within current record'
      },
      {
        id: 'EV04',
        time: '2026-08-02 14:30',
        actor: 'Adobe Customer Support',
        action: 'stated fee was assessed as 50% remaining contract balance per',
        target: 'Terms Section 3.4',
        effect: 'provider justification communicated [See evidence · E06]',
        evidence_ids: ['E06', 'E07'],
        user_statement_ids: ['U01'],
        assessment: 'Established within current record'
      },
      {
        id: 'EV05',
        time: '2026-08-04 09:15',
        actor: 'Adobe Support Escalations',
        action: 'issued final rejection for refund request on',
        target: 'Ticket #TKT-ADB-8810',
        effect: 'denial documented in record [See evidence · E09]',
        evidence_ids: ['E09'],
        user_statement_ids: ['U01'],
        assessment: 'Established within current record'
      }
    ],
    claims: [
      {
        id: 'C01',
        text: 'User completed online cancellation on July 10, 2026, receiving an on-screen cancellation confirmation.',
        actor: 'User & Adobe Web Portal',
        action: 'processed cancellation for',
        target: 'Account #ADB-77120',
        time: '2026-07-10',
        supporting_evidence: ['E03', 'E04'],
        qualifying_evidence: [],
        conflicting_evidence: [],
        user_statement_ids: ['U01'],
        assessment: 'Established within current record',
        reasoning: 'Portal screenshot E04 proves cancellation confirmation notice was displayed on July 10.',
        scope: 'Cancellation submission.',
        limits: ['Confirms portal notice was shown; does not prevent automated billing system from triggering ETF.'],
        causal_relationship: 'established'
      },
      {
        id: 'C02',
        text: 'Adobe debited $140.00 from user credit card on August 1, 2026.',
        actor: 'Adobe Billing',
        action: 'charged fee of $140.00 to',
        target: 'User Payment Card',
        time: '2026-08-01',
        supporting_evidence: ['E05'],
        qualifying_evidence: [],
        conflicting_evidence: [],
        user_statement_ids: ['U01'],
        assessment: 'Established within current record',
        reasoning: 'Bank statement E05 confirms $140.00 posted debit.',
        scope: 'Financial debit.',
        limits: ['Bank statement proves debit occurred.'],
        causal_relationship: 'established'
      },
      {
        id: 'C03',
        text: 'Adobe support cited Section 3.4 (50% remaining contract fee) as the justification for the $140 charge.',
        actor: 'Adobe Support',
        action: 'communicated policy basis',
        target: 'Ticket #TKT-ADB-8810',
        time: '2026-08-02',
        supporting_evidence: ['E06', 'E07', 'E09'],
        qualifying_evidence: [],
        conflicting_evidence: [],
        user_statement_ids: ['U01'],
        assessment: 'Established within current record',
        reasoning: 'Chat transcript E06 and email E09 cite Section 3.4 terms.',
        scope: 'Provider policy explanation.',
        limits: ['Establishes provider rationale.'],
        causal_relationship: 'none'
      },
      {
        id: 'C04',
        text: 'Early Termination Fee terms and exact penalty calculations were clearly highlighted during user checkout.',
        actor: 'Adobe Systems Inc.',
        action: 'disclosed ETF terms during',
        target: 'Signup flow on March 15',
        time: '2026-03-15',
        supporting_evidence: [],
        qualifying_evidence: ['E01', 'E08'],
        conflicting_evidence: [],
        user_statement_ids: ['U01'],
        assessment: 'Reported',
        reasoning: 'Signup screen capture E08 shows ETF terms were contained inside a collapsed tooltip, requiring explicit click expansion to view.',
        scope: 'Checkout disclosure visibility.',
        limits: ['User recording shows collapsed tooltip; server click logs not provided.'],
        causal_relationship: 'unresolved'
      }
    ],
    gaps: [
      {
        id: 'G01',
        what_is_unknown: 'Full checkout clickstream audit log proving whether user expanded the ETF disclosure tooltip during signup on March 15.',
        why_it_matters: 'Clarifies what disclosure was displayed and whether user interacted with it during signup.',
        what_evidence_could_resolve_it: 'Merchant checkout session audit log or full order disclosure transcript.',
        where_how_to_obtain: 'Request order session disclosure transcript via formal customer compliance inquiry.',
        what_not_to_over_collect: 'Do not collect unrelated account usage logs.',
        target_claim_ids: ['C04']
      },
      {
        id: 'G02',
        what_is_unknown: 'Whether Adobe cancellation confirmation page E04 contained a disclosures sub-clause warning of pending ETF assessment.',
        why_it_matters: 'Clarifies if cancellation flow provided immediate notice of impending $140 debit before final submission.',
        what_evidence_could_resolve_it: 'Full uncropped webpage DOM render or email cancellation receipt.',
        where_how_to_obtain: 'Export full HTML page save or cancellation confirmation email.',
        what_not_to_over_collect: 'Do not collect unrelated web browser history.',
        target_claim_ids: ['C01']
      }
    ],
    actions: [
      {
        id: 'A01',
        title: 'Submit Credit Card Charge Dispute',
        description: 'Provide cancellation confirmation E04 and bank statement E05 to card issuer disputing $140.00 fee following cancelled plan.',
        target_gap_id: 'G02',
        priority: 'high'
      },
      {
        id: 'A02',
        title: 'Request Signup Disclosure Audit Log',
        description: 'Submit formal customer inquiry requesting Adobe order session logs for checkout #ADB-77120 regarding tooltip disclosure visibility.',
        target_gap_id: 'G01',
        priority: 'medium'
      }
    ],
    summary: {
      epistemic_warning: 'Claimed source: Adobe / User · cancellation confirmed on July 10; $140 ETF charged on Aug 1. Disclosure visibility during signup remains unresolved in supplied record.',
      total_evidence_count: 9,
      established_claims_count: 3,
      unresolved_claims_count: 1,
      conflicted_claims_count: 0,
      user_reported_claims_count: 0
    }
  },
  {
    id: 'case-sample-01',
    case_number: 'C-0001',
    title: 'SaaS Cloud Account Suspension & Service Credit Dispute',
    objective: 'Establish whether the service provider issued advance policy warnings prior to locking server access, and determine if API usage violated agreed tier limits.',
    user_story: 'I signed up for an annual Pro Plan ($1,200/yr) on June 10, 2026. On August 2, 2026, my server access was suddenly revoked with an automated system message stating "Suspended for TOS violation - excessive automated requests". Customer support denied my refund and refused to let me download my database snapshot. I believe my automated queries were well within my 10,000 requests/day quota as specified in my signup confirmation.',
    statements: [
      {
        id: 'U01',
        text: 'I signed up for an annual Pro Plan ($1,200/yr) on June 10, 2026. On August 2, 2026, my server access was suddenly revoked with an automated system message stating "Suspended for TOS violation - excessive automated requests". Customer support denied my refund and refused to let me download my database snapshot. I believe my automated queries were well within my 10,000 requests/day quota as specified in my signup confirmation.',
        submitted_at: '2026-08-02T09:00:00.000Z',
        attachment_ids: ['E01', 'E02', 'E03', 'E04', 'E05'],
      },
    ],
    evidence: [
      {
        id: 'E01',
        label: 'Signup Confirmation & Plan Features Email',
        claimed_source: 'CloudScale SaaS Provider',
        acquisition_method: 'pasted_text',
        input_form: 'email_text',
        evidence_time: '2026-06-10 14:22',
        received_at: '2026-08-02',
        subject_object_ids: ['Account: #CS-99410', 'Plan: Pro Tier Annual'],
        content: 'From: billing@cloudscale.io\nTo: user@company.com\nSubject: Welcome to CloudScale Pro!\nThank you for purchasing CloudScale Pro Tier Annual ($1,200.00). Your subscription includes 10,000 API queries per day and 99.9% uptime SLA.',
        source_attribution: 'Attributed to billing@cloudscale.io via user pasted email copy. Email headers not supplied.',
        case_object_match: 'Matches Account #CS-99410 and user email address.',
        case_object_match_status: 'matched',
        completeness_context: 'Pasted body text provided without full MIME raw headers.',
        integrity_signals: 'User-provided text; formatting aligns with standard transactional templates.',
        corroborated_by: ['E02'],
        qualified_by: [],
        conflicted_by: ['E03'],
        limitations: [
          'Claimed source: CloudScale SaaS Provider · Supplied by user as pasted text · Original email headers not verified.',
          'Does not establish whether subsequent terms of service updates were issued after June 10.'
        ]
      },
      {
        id: 'E02',
        label: 'Annual Subscription Invoice #INV-2026-8812',
        claimed_source: 'CloudScale SaaS Provider',
        acquisition_method: 'user_upload',
        input_form: 'receipt',
        evidence_time: '2026-06-10 14:25',
        received_at: '2026-08-02',
        subject_object_ids: ['Invoice: #INV-2026-8812', 'Transaction: #TXN-77319'],
        content: 'CloudScale Inc. Invoice #INV-2026-8812. Amount paid: $1,200.00 USD. Billing Cycle: June 10, 2026 - June 10, 2027. Item: Pro Tier Server Workspace (1 Year). Paid via Credit Card ****4821.',
        source_attribution: 'PDF receipt generated by CloudScale payment processor.',
        case_object_match: 'Matches subscription dates and company identity.',
        case_object_match_status: 'matched',
        completeness_context: 'Complete single-page invoice document.',
        integrity_signals: 'Standard PDF metadata present.',
        corroborated_by: ['E01'],
        qualified_by: [],
        conflicted_by: [],
        limitations: [
          'Confirms financial transaction and active subscription window; does not govern acceptable use enforcement rules.'
        ]
      },
      {
        id: 'E03',
        label: 'Dashboard Access Lock Screenshot',
        claimed_source: 'CloudScale Web Dashboard',
        acquisition_method: 'user_upload',
        input_form: 'screenshot',
        evidence_time: '2026-08-02 09:15',
        received_at: '2026-08-02',
        subject_object_ids: ['Account: #CS-99410'],
        content: 'Screen showing dialog overlay: "Access Denied. Account #CS-99410 has been suspended due to detected automated traffic exceeding rate abuse policies. Contact compliance@cloudscale.io."',
        source_attribution: 'Appears to be a web browser screenshot of app.cloudscale.io.',
        case_object_match: 'Explicitly cites Account #CS-99410.',
        case_object_match_status: 'matched',
        completeness_context: 'Cropped screenshot showing dialog box without browser URL bar visible.',
        integrity_signals: 'Visual rendering consistent with standard SaaS interface elements.',
        corroborated_by: ['E04'],
        qualified_by: [],
        conflicted_by: [],
        limitations: [
          'Claimed source: CloudScale Dashboard · Supplied by user as PNG screenshot · Client-side browser screenshot can be rendered or altered.'
        ]
      },
      {
        id: 'E04',
        label: 'Customer Support Email regarding Termination',
        claimed_source: 'CloudScale Compliance Support',
        acquisition_method: 'pasted_text',
        input_form: 'email_text',
        evidence_time: '2026-08-02 11:40',
        received_at: '2026-08-02',
        subject_object_ids: ['Case: #TKT-44109', 'Account: #CS-99410'],
        content: 'From: compliance@cloudscale.io\nSubject: Re: Ticket #TKT-44109 Account Lock\nHello, Our security monitoring logged 42,000 burst requests from your API keys between 03:00 UTC and 04:00 UTC on Aug 2. This exceeded safe platform limits. Per Section 8.2 of our Terms, we reserve the right to immediately isolate accounts causing infrastructure degradation.',
        source_attribution: 'Email text attributed to compliance@cloudscale.io.',
        case_object_match: 'References Ticket #TKT-44109 and Account #CS-99410.',
        case_object_match_status: 'matched',
        completeness_context: 'Text excerpt of support reply.',
        integrity_signals: 'Contains specific technical claims (42,000 burst requests).',
        corroborated_by: ['E03'],
        qualified_by: [],
        conflicted_by: ['E01'],
        limitations: [
          'Establishes that CloudScale communicated this metric to user on Aug 2; does not independently verify server log accuracy.'
        ]
      },
      {
        id: 'E05',
        label: 'Client-Side Local API Export Log',
        claimed_source: 'User Internal Logging Script',
        acquisition_method: 'user_upload',
        input_form: 'document',
        evidence_time: '2026-08-02 03:00 to 04:00',
        received_at: '2026-08-02',
        subject_object_ids: ['Client System Logs'],
        content: 'Log export showing 3,210 successful HTTP POST requests sent from IP 192.0.2.45 between 03:00:00 UTC and 04:00:00 UTC on 2026-08-02.',
        source_attribution: 'User self-generated client application log file.',
        case_object_match: 'Covers the time window cited in Ticket #TKT-44109.',
        case_object_match_status: 'unclear',
        completeness_context: 'Log covers single IP client outbound traffic.',
        integrity_signals: 'Self-reported telemetry.',
        corroborated_by: [],
        qualified_by: ['E04'],
        conflicted_by: ['E04'],
        limitations: [
          'Claimed source: User Client Application · Represents local outbound traffic recorded by user; cannot disprove inbound server-side load from other tokens or compromised credentials.'
        ]
      }
    ],
    events: [
      {
        id: 'EV01',
        time: '2026-06-10 14:22',
        actor: 'CloudScale SaaS Provider',
        action: 'sent subscription confirmation email for',
        target: 'Pro Tier Annual Account #CS-99410',
        effect: 'subscription terms and 10,000 daily API quota communicated',
        evidence_ids: ['E01', 'E02'],
        user_statement_ids: ['U01'],
        assessment: 'Established within current record'
      },
      {
        id: 'EV02',
        time: '2026-06-10 14:25',
        actor: 'User',
        action: 'paid $1,200.00 invoice for',
        target: '1-year Pro Tier server license',
        effect: 'payment completed for period June 2026 to June 2027',
        evidence_ids: ['E02'],
        user_statement_ids: ['U01'],
        assessment: 'Established within current record'
      },
      {
        id: 'EV03',
        time: '2026-08-02 03:00 - 04:00',
        actor: 'User API Client',
        action: 'transmitted 3,210 API requests to',
        target: 'CloudScale API endpoint',
        effect: 'outbound request volume logged client-side',
        evidence_ids: ['E05'],
        user_statement_ids: ['U01'],
        assessment: 'Reported'
      },
      {
        id: 'EV04',
        time: '2026-08-02 09:15',
        actor: 'CloudScale Web Dashboard',
        action: 'displayed account suspension overlay on',
        target: 'Account #CS-99410 admin portal',
        effect: 'user access blocked',
        evidence_ids: ['E03'],
        user_statement_ids: ['U01'],
        assessment: 'Established within current record'
      },
      {
        id: 'EV05',
        time: '2026-08-02 11:40',
        actor: 'CloudScale Compliance Support',
        action: 'sent email asserting 42,000 burst requests occurred on',
        target: 'Account #CS-99410 infrastructure',
        effect: 'provider stated reason for suspension',
        evidence_ids: ['E04'],
        user_statement_ids: ['U01'],
        assessment: 'Established within current record'
      }
    ],
    claims: [
      {
        id: 'C01',
        text: 'User purchased an active Pro Tier subscription valid through June 2027.',
        actor: 'User',
        action: 'purchased and paid for',
        target: 'Pro Tier Annual Plan',
        time: '2026-06-10',
        supporting_evidence: ['E01', 'E02'],
        qualifying_evidence: [],
        conflicting_evidence: [],
        user_statement_ids: ['U01'],
        assessment: 'Established within current record',
        reasoning: 'Invoice E02 and welcome message E01 establish payment of $1,200 for annual service period.',
        scope: 'Financial purchase of Pro Tier account.',
        limits: ['Payment does not guarantee immunity from suspension if acceptable use terms are breached.'],
        causal_relationship: 'none'
      },
      {
        id: 'C02',
        text: 'CloudScale locked dashboard access for Account #CS-99410 on August 2, 2026.',
        actor: 'CloudScale SaaS Provider',
        action: 'suspended web access to',
        target: 'Account #CS-99410',
        time: '2026-08-02',
        supporting_evidence: ['E03', 'E04'],
        qualifying_evidence: [],
        conflicting_evidence: [],
        user_statement_ids: ['U01'],
        assessment: 'Established within current record',
        reasoning: 'Screenshot E03 and support response E04 both confirm active account suspension on Aug 2.',
        scope: 'Access restriction to Account #CS-99410.',
        limits: ['Screenshot provided by user; corroborated by support communication E04.'],
        causal_relationship: 'established'
      },
      {
        id: 'C03',
        text: 'The measurement scope and total API request volume during 03:00–04:00 UTC differ between user client log and provider account total.',
        actor: 'User & CloudScale',
        action: 'recorded request metrics for',
        target: 'API endpoint usage',
        time: '2026-08-02 03:00-04:00',
        supporting_evidence: ['E04', 'E05'],
        qualifying_evidence: [],
        conflicting_evidence: [],
        user_statement_ids: ['U01'],
        assessment: 'Contested',
        reasoning: 'Support email E04 asserts 42,000 requests server-side across account tokens, while user log E05 records 3,210 outbound requests from a single IP. Scope measurement differs.',
        scope: 'API traffic volume in 1-hour window on Aug 2.',
        limits: [
          'User log E05 represents single client IP traffic; provider metric E04 represents total server-side logged requests across all keys/tokens.',
          'Record does not contain raw server log files or full network pcap.'
        ],
        causal_relationship: 'unresolved'
      },
      {
        id: 'C04',
        text: 'CloudScale issued prior written policy warnings before locking the account on August 2.',
        actor: 'CloudScale SaaS Provider',
        action: 'sent advance warning regarding',
        target: 'rate abuse',
        time: 'Prior to 2026-08-02',
        supporting_evidence: [],
        qualifying_evidence: [],
        conflicting_evidence: [],
        user_statement_ids: ['U01'],
        assessment: 'Reported',
        reasoning: 'The supplied case record contains no emails, notifications, or logs indicating advance notice prior to the Aug 2 lock.',
        scope: 'Pre-suspension communication.',
        limits: ['Absence of evidence in supplied files does not prove provider sent no automated system warnings if user missed them.'],
        causal_relationship: 'unresolved'
      }
    ],
    gaps: [
      {
        id: 'G01',
        what_is_unknown: 'Whether CloudScale system sent automated warning notifications prior to suspension, or whether Section 8.2 allows immediate termination without warning.',
        why_it_matters: 'Determines whether suspension followed contractually required warning procedures.',
        what_evidence_could_resolve_it: 'Full CloudScale Terms of Service document (specifically Section 8.2) and notification log from user email account covering July 25 – August 1.',
        where_how_to_obtain: 'Download published Terms of Service from CloudScale website and export email search logs for @cloudscale.io.',
        what_not_to_over_collect: 'Do not collect full inbox contents; query only messages from domain cloudscale.io.',
        target_claim_ids: ['C04']
      },
      {
        id: 'G02',
        what_is_unknown: 'Server-side API breakdown showing API key ID and IP addresses associated with the claimed 42,000 burst requests.',
        why_it_matters: 'Resolves whether additional unauthorized API keys or third-party integrations caused the traffic surge.',
        what_evidence_could_resolve_it: 'Detailed server access log excerpt from CloudScale support showing timestamped API key invocations.',
        where_how_to_obtain: 'Request formal API access log excerpt for Account #CS-99410 via compliance ticket #TKT-44109.',
        what_not_to_over_collect: 'Do not request database contents or other tenant logs.',
        target_claim_ids: ['C03']
      }
    ],
    actions: [
      {
        id: 'A01',
        title: 'Obtain Section 8.2 of Terms of Service',
        description: 'Review Section 8.2 of CloudScale Terms of Service to check whether immediate account suspension without prior notice is contractually authorized.',
        target_gap_id: 'G01',
        priority: 'high'
      },
      {
        id: 'A02',
        title: 'Request Server-Side API Key Log Excerpt',
        description: 'Reply to compliance ticket #TKT-44109 requesting a log export showing API key identifiers and client IP addresses for the 42,000 requests.',
        target_gap_id: 'G02',
        priority: 'high'
      },
      {
        id: 'A03',
        title: 'Archive User Email Logs for @cloudscale.io',
        description: 'Export all messages received from cloudscale.io between June 10 and August 2 to verify if any automated quota alerts were issued.',
        target_gap_id: 'G01',
        priority: 'medium'
      }
    ],
    summary: {
      epistemic_warning: 'Claimed source: CloudScale / User · User-supplied artifacts (E01, E03, E05) are evaluated as self-reported records. Server-side log authenticity is unverified.',
      total_evidence_count: 5,
      established_claims_count: 2,
      unresolved_claims_count: 2,
      conflicted_claims_count: 0,
      user_reported_claims_count: 0
    }
  },
  {
    id: 'case-sample-02',
    case_number: 'C-0002',
    title: 'E-Commerce Order Delivery & Courier Signature Dispute',
    objective: 'Establish whether the merchant delivered the high-value equipment order or if the courier proof of delivery belongs to an incorrect package.',
    user_story: 'I ordered a $3,400 video editing workstation (Order #ORD-99120) on July 14, 2026. On July 20, the tracking status updated to "Delivered - Signed by J. Smith". I was out of state from July 18 to July 22 and live alone. The seller refused my refund claim, pointing to the courier delivery receipt. However, the carrier manifest lists the shipment weight as 2.1 lbs, whereas the workstation manufacturer specifies the chassis weight as 34.5 lbs.',
    statements: [
      {
        id: 'U01',
        text: 'I ordered a $3,400 video editing workstation (Order #ORD-99120) on July 14, 2026. On July 20, the tracking status updated to "Delivered - Signed by J. Smith". I was out of state from July 18 to July 22 and live alone. The seller refused my refund claim, pointing to the courier delivery receipt. However, the carrier manifest lists the shipment weight as 2.1 lbs, whereas the workstation manufacturer specifies the chassis weight as 34.5 lbs.',
        submitted_at: '2026-07-22T09:00:00.000Z',
        attachment_ids: ['E01', 'E02', 'E03'],
      },
    ],
    evidence: [
      {
        id: 'E01',
        label: 'Order Confirmation Email #ORD-99120',
        claimed_source: 'TechDirect Hardware Merchant',
        acquisition_method: 'pasted_text',
        input_form: 'email_text',
        evidence_time: '2026-07-14 10:15',
        received_at: '2026-07-22',
        subject_object_ids: ['Order: #ORD-99120', 'Item: Workstation Pro Ultra'],
        content: 'TechDirect Order Confirmation #ORD-99120. Item: Workstation Pro Ultra (Weight: 34.5 lbs). Total: $3,400.00. Shipping Address: 1420 Pine St, Seattle WA. Carrier: FastCourier Express.',
        source_attribution: 'Pasted email copy from TechDirect.',
        case_object_match: 'Matches Order #ORD-99120.',
        case_object_match_status: 'matched',
        completeness_context: 'Order summary text.',
        integrity_signals: 'Matches merchant order formatting.',
        corroborated_by: ['E02'],
        qualified_by: [],
        conflicted_by: [],
        limitations: [
          'Claimed source: TechDirect Merchant · Supplied by user as text · Confirms order details and item specification.'
        ]
      },
      {
        id: 'E02',
        label: 'Courier Tracking & Delivery Receipt',
        claimed_source: 'FastCourier Tracking Portal',
        acquisition_method: 'user_upload',
        input_form: 'screenshot',
        evidence_time: '2026-07-20 14:15',
        received_at: '2026-07-22',
        subject_object_ids: ['Tracking: #FC-8812049', 'Order: #ORD-99120'],
        content: 'FastCourier Tracking #FC-8812049. Status: Delivered. Timestamp: July 20, 2026 14:15. Signed by: J. SMITH. Billed Weight: 2.1 lbs. Destination: Seattle, WA 98101.',
        source_attribution: 'Screenshot of tracking portal.',
        case_object_match: 'Lists Tracking #FC-8812049 tied to Order #ORD-99120.',
        case_object_match_status: 'matched',
        completeness_context: 'Screenshot of tracking portal summary.',
        integrity_signals: 'Web page screenshot.',
        corroborated_by: [],
        qualified_by: ['E03'],
        conflicted_by: ['E01'],
        limitations: [
          'Courier proof establishes that a package under tracking #FC-8812049 was marked delivered on July 20. Billed weight is listed as 2.1 lbs.'
        ]
      },
      {
        id: 'E03',
        label: 'Flight Boarding Pass & Hotel Receipt (Out of State)',
        claimed_source: 'AeroAir & Grand Hotel Denver',
        acquisition_method: 'user_upload',
        input_form: 'pdf',
        evidence_time: '2026-07-18 to 2026-07-22',
        received_at: '2026-07-22',
        subject_object_ids: ['Passenger: User', 'Location: Denver CO'],
        content: 'AeroAir Boarding Pass: Flight AA-412 SEA to DEN July 18. Grand Hotel Denver Receipt: Check-in July 18 18:00, Check-out July 22 11:00.',
        source_attribution: 'Airline and Hotel PDF document receipts.',
        case_object_match: 'Matches user identity and dates of absence.',
        case_object_match_status: 'matched',
        completeness_context: 'Full travel documents.',
        integrity_signals: 'Format appears consistent with official PDF receipts.',
        corroborated_by: [],
        qualified_by: [],
        conflicted_by: [],
        limitations: [
          'Establishes user physical presence in Denver CO on July 20; does not prove signatory identity "J. SMITH".'
        ]
      }
    ],
    events: [
      {
        id: 'EV01',
        time: '2026-07-14 10:15',
        actor: 'TechDirect Merchant',
        action: 'confirmed order for 34.5 lb workstation under',
        target: 'Order #ORD-99120',
        effect: 'order created for $3,400',
        evidence_ids: ['E01'],
        user_statement_ids: ['U01'],
        assessment: 'Established within current record'
      },
      {
        id: 'EV02',
        time: '2026-07-18 - 2026-07-22',
        actor: 'User',
        action: 'traveled to Denver, CO according to',
        target: 'AeroAir & Grand Hotel receipts',
        effect: 'user was out of state during delivery timestamp',
        evidence_ids: ['E03'],
        user_statement_ids: ['U01'],
        assessment: 'Established within current record'
      },
      {
        id: 'EV03',
        time: '2026-07-20 14:15',
        actor: 'FastCourier Express',
        action: 'recorded delivery and signature "J. Smith" for tracking',
        target: '#FC-8812049 (Billed Weight: 2.1 lbs)',
        effect: 'package marked delivered',
        evidence_ids: ['E02'],
        user_statement_ids: ['U01'],
        assessment: 'Established within current record'
      }
    ],
    claims: [
      {
        id: 'C01',
        text: 'The physical item delivered under tracking #FC-8812049 had a recorded weight of 2.1 lbs.',
        actor: 'FastCourier Express',
        action: 'recorded shipment weight of',
        target: '2.1 lbs on tracking manifest',
        time: '2026-07-20',
        supporting_evidence: ['E02'],
        qualifying_evidence: [],
        conflicting_evidence: ['E01'],
        user_statement_ids: ['U01'],
        assessment: 'Established within current record',
        reasoning: 'Tracking manifest E02 explicitly specifies Billed Weight as 2.1 lbs, creating a material discrepancy with 34.5 lb workstation specification in E01.',
        scope: 'Courier billed weight record.',
        limits: ['Manifest weight reflects carrier scan data.'],
        causal_relationship: 'established'
      },
      {
        id: 'C02',
        text: 'The signatory identity "J. SMITH" on the delivery receipt corresponds to the user.',
        actor: 'FastCourier & User',
        action: 'signed for delivery',
        target: '1420 Pine St, Seattle WA',
        time: '2026-07-20 14:15',
        supporting_evidence: [],
        qualifying_evidence: ['E02'],
        conflicting_evidence: ['E03'],
        user_statement_ids: ['U01'],
        assessment: 'Contested',
        reasoning: 'Tracking E02 lists signature "J. SMITH", but hotel receipt and boarding pass E03 establish user was in Denver CO on July 20. Supplied record does not establish identity of "J. SMITH".',
        scope: 'Identity of signatory.',
        limits: ['Record does not establish whether "J. SMITH" is a neighbor, bystander, or courier entry.'],
        causal_relationship: 'unresolved'
      }
    ],
    gaps: [
      {
        id: 'G01',
        what_is_unknown: 'Master carrier bill of lading showing origin dispatch weight from TechDirect warehouse for Order #ORD-99120.',
        why_it_matters: 'Resolves whether merchant shipped a replacement lightweight item or assigned an incorrect tracking number to the order.',
        what_evidence_could_resolve_it: 'Merchant warehouse dispatch record or carrier origin scan receipt showing package dimensions.',
        where_how_to_obtain: 'Request warehouse dispatch confirmation from TechDirect customer escalations.',
        what_not_to_over_collect: 'Do not collect merchant internal inventory databases.',
        target_claim_ids: ['C01', 'C02']
      }
    ],
    actions: [
      {
        id: 'A01',
        title: 'Submit Courier Weight Discrepancy Dispute',
        description: 'Provide FastCourier receipt E02 (2.1 lbs) and TechDirect specification E01 (34.5 lbs) to payment card issuer to demonstrate tracking mismatch.',
        target_gap_id: 'G01',
        priority: 'high'
      }
    ],
    summary: {
      epistemic_warning: 'Tracking weight discrepancy observed (2.1 lbs vs 34.5 lbs). Original source delivery scan authenticity and signatory identity remain unverified in record.',
      total_evidence_count: 3,
      established_claims_count: 1,
      unresolved_claims_count: 1,
      conflicted_claims_count: 0,
      user_reported_claims_count: 0
    }
  }
];
