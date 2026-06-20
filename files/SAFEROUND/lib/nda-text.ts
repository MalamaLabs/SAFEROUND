// lib/nda-text.ts
// The NDA text shown at click-accept. Versioned so the audit log records
// exactly which text each investor agreed to. Reviewed by counsel before use.
// This is a mutual confidentiality agreement template, not legal advice.

import { NDA_VERSION } from "./investors";

export const NDA = {
  version: NDA_VERSION,
  title: "Mutual Non-Disclosure Agreement",
  effectiveLabel: "Accepted electronically on the date and time recorded below.",
  body: [
    {
      h: "1. Parties and Purpose",
      p: "This Mutual Non-Disclosure Agreement (the \"Agreement\") is entered into between Mālama Labs, Inc., a Delaware corporation (\"Company\"), and the individual and entity accepting these terms (\"Recipient\"). The purpose is to permit the parties to evaluate a potential investment in the Company (the \"Purpose\").",
    },
    {
      h: "2. Confidential Information",
      p: "\"Confidential Information\" means all non-public information disclosed by the Company to Recipient in connection with the Purpose, including financial models, projections, the data room contents, technical architecture, business plans, customer and pipeline information, token economics, and any materials marked or reasonably understood to be confidential, whether disclosed in writing, orally, or by access to the investor data room.",
    },
    {
      h: "3. Obligations",
      p: "Recipient shall (a) hold Confidential Information in strict confidence, (b) use it solely for the Purpose, (c) not disclose it to any third party except to Recipient's representatives who need to know it for the Purpose and who are bound by confidentiality obligations at least as protective as these, and (d) protect it using at least the same degree of care Recipient uses for its own confidential information, and no less than reasonable care.",
    },
    {
      h: "4. Exclusions",
      p: "Confidential Information does not include information that (a) is or becomes public through no breach by Recipient, (b) was rightfully known to Recipient before disclosure, (c) is rightfully received from a third party without restriction, or (d) is independently developed by Recipient without use of Confidential Information.",
    },
    {
      h: "5. No Investment Offer; No Reliance",
      p: "The materials are provided for evaluation only and do not constitute an offer to sell or a solicitation to buy any security. All projections are forward-looking, base-case estimates and are not guarantees. The Company makes no representation or warranty as to the accuracy or completeness of the materials, and Recipient shall not rely on them except as expressly set forth in definitive transaction documents.",
    },
    {
      h: "6. Compelled Disclosure",
      p: "If Recipient is compelled by law to disclose Confidential Information, Recipient shall, where legally permitted, give the Company prompt notice so the Company may seek a protective order, and shall disclose only the portion legally required.",
    },
    {
      h: "7. Term and Return",
      p: "These obligations survive for three (3) years from acceptance. Upon the Company's request, Recipient shall return or destroy all Confidential Information and certify the same, except for one archival copy retained for compliance and copies in routine backups.",
    },
    {
      h: "8. No License; Remedies",
      p: "No license or other right is granted except the limited right to use Confidential Information for the Purpose. Recipient acknowledges that breach may cause irreparable harm for which monetary damages are inadequate, and the Company is entitled to seek injunctive relief in addition to other remedies.",
    },
    {
      h: "9. Governing Law",
      p: "This Agreement is governed by the laws of the State of Delaware, without regard to conflict-of-laws principles. The parties consent to the exclusive jurisdiction of the state and federal courts located in Delaware.",
    },
    {
      h: "10. Electronic Acceptance",
      p: "Recipient agrees that clicking to accept constitutes a legally binding electronic signature under the federal ESIGN Act and applicable state law. The Company will record the date, time, IP address, and browser of acceptance as evidence of agreement.",
    },
  ],
};
