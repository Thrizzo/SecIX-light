import { BookOpen, ScrollText, ClipboardList } from 'lucide-react';

export type DocumentTemplateType = 'policy' | 'standard' | 'procedure';

export interface DocumentSection {
  title: string;
  description: string;
}

export interface FrameworkMapping {
  nist_sp_800_53?: string[];
  cis_controls_v8?: string[];
  mitre_attack?: string[];
  iso_27001?: string[];
}

export interface RecommendedDocument {
  id: string;
  title: string;
  type: DocumentTemplateType;
  description: string;
  keyTopics: string[];
  sections: DocumentSection[];
  frameworkMappings: FrameworkMapping;
}

// Section templates for different document types
export const SECTION_TEMPLATES = {
  policy: [
    { title: 'Purpose & Objectives', description: 'Define what this policy aims to achieve and why' },
    { title: 'Scope', description: 'Define who and what this policy applies to' },
    { title: 'Roles & Responsibilities', description: 'Define who is responsible for what' },
    { title: 'Policy Statements', description: 'The core policy requirements and rules' },
    { title: 'Compliance & Exceptions', description: 'How compliance is measured and exceptions handled' },
    { title: 'Review & Updates', description: 'How and when this policy is reviewed' },
    { title: 'Related Documents', description: 'Links to related policies, standards, and procedures' },
  ],
  standard: [
    { title: 'Purpose', description: 'Define the purpose of this standard' },
    { title: 'Scope', description: 'Define applicability boundaries' },
    { title: 'Requirements', description: 'Specific mandatory requirements (numbered)' },
    { title: 'Metrics & Monitoring', description: 'How compliance is measured' },
    { title: 'Compliance Verification', description: 'Verification methods and criteria' },
    { title: 'References', description: 'External references and related standards' },
  ],
  procedure: [
    { title: 'Purpose', description: 'What this procedure accomplishes' },
    { title: 'Scope', description: 'When and where this procedure applies' },
    { title: 'Prerequisites', description: 'Required conditions before starting' },
    { title: 'Step-by-Step Instructions', description: 'Detailed procedural steps' },
    { title: 'Verification & Validation', description: 'How to verify successful completion' },
    { title: 'Troubleshooting', description: 'Common issues and resolutions' },
    { title: 'References', description: 'Related documents and resources' },
  ],
};

export const RECOMMENDED_DOCUMENTS: RecommendedDocument[] = [
  // Core Policies
  {
    id: 'isms-policy',
    title: 'ISMS & Information Security Policy',
    type: 'policy',
    description: 'Establishes the organization\'s overall approach to information security, demonstrating leadership commitment and defining the ISMS scope.',
    keyTopics: ['ISMS scope', 'Leadership commitment', 'Roles/ownership', 'Objectives', 'Policy governance', 'Continual improvement'],
    sections: [
      { title: 'Purpose & Objectives', description: 'Define the purpose of the ISMS and security objectives' },
      { title: 'Scope', description: 'Define ISMS boundaries, organizational units, and systems covered' },
      { title: 'Leadership Commitment', description: 'Statement of management commitment to information security' },
      { title: 'Roles & Responsibilities', description: 'Security roles including CISO, security team, and asset owners' },
      { title: 'Security Objectives', description: 'Measurable information security objectives' },
      { title: 'Policy Framework', description: 'Hierarchy of policies, standards, and procedures' },
      { title: 'Continual Improvement', description: 'Process for measuring and improving the ISMS' },
      { title: 'Compliance & Exceptions', description: 'Compliance requirements and exception handling' },
    ],
    frameworkMappings: {
      nist_sp_800_53: ['PM-1', 'PM-2', 'PM-3', 'PM-9', 'PL-1', 'PL-2'],
      cis_controls_v8: ['15.1', '15.2', '15.3'],
      iso_27001: ['A.5.1', 'A.5.2', 'A.5.3', 'A.5.4', 'A.5.35', 'A.5.36', 'A.5.37'],
      mitre_attack: [],
    },
  },
  {
    id: 'risk-management-policy',
    title: 'Risk Management Policy',
    type: 'policy',
    description: 'Defines how the organization identifies, assesses, treats, and monitors information security risks.',
    keyTopics: ['Risk methodology', 'Risk criteria', 'Assessment approach', 'Risk acceptance', 'Treatment planning', 'Exceptions'],
    sections: [
      { title: 'Purpose & Objectives', description: 'Purpose of risk management and alignment with business objectives' },
      { title: 'Scope', description: 'Risk management boundaries and applicability' },
      { title: 'Risk Methodology', description: 'Risk assessment methodology and approach' },
      { title: 'Risk Criteria', description: 'Impact and likelihood scales, risk appetite thresholds' },
      { title: 'Risk Assessment Process', description: 'Steps for identifying, analyzing, and evaluating risks' },
      { title: 'Risk Treatment', description: 'Treatment options: accept, mitigate, transfer, avoid' },
      { title: 'Risk Acceptance', description: 'Authority levels and criteria for accepting risks' },
      { title: 'Exception Handling', description: 'Process for risk exceptions and compensating controls' },
      { title: 'Monitoring & Review', description: 'Ongoing risk monitoring and periodic reviews' },
    ],
    frameworkMappings: {
      nist_sp_800_53: ['RA-1', 'RA-2', 'RA-3', 'RA-5', 'RA-7', 'PM-9', 'PM-28'],
      cis_controls_v8: ['1.1', '7.1', '18.1'],
      iso_27001: ['A.5.7', 'A.5.8', 'A.5.29', 'A.5.30', 'A.8.8'],
      mitre_attack: [],
    },
  },
  {
    id: 'people-security-policy',
    title: 'People Security & Acceptable Use Policy',
    type: 'policy',
    description: 'Covers human resource security controls including screening, training, and acceptable use of organizational resources.',
    keyTopics: ['Screening', 'Onboarding/offboarding', 'Awareness & training', 'Disciplinary', 'Acceptable use', 'Remote work/BYOD'],
    sections: [
      { title: 'Purpose & Objectives', description: 'Purpose of people security controls' },
      { title: 'Scope', description: 'Applicability to employees, contractors, and third parties' },
      { title: 'Pre-Employment Screening', description: 'Background checks and verification requirements' },
      { title: 'Onboarding Requirements', description: 'Security orientation, agreements, and access provisioning' },
      { title: 'Security Awareness & Training', description: 'Training requirements and frequency' },
      { title: 'Acceptable Use', description: 'Acceptable use of IT resources, email, internet, and social media' },
      { title: 'Remote Work & BYOD', description: 'Requirements for remote working and personal devices' },
      { title: 'Disciplinary Process', description: 'Consequences for policy violations' },
      { title: 'Offboarding', description: 'Access termination and asset return procedures' },
    ],
    frameworkMappings: {
      nist_sp_800_53: ['PS-1', 'PS-2', 'PS-3', 'PS-4', 'PS-5', 'PS-6', 'PS-7', 'AT-1', 'AT-2', 'AT-3', 'PL-4'],
      cis_controls_v8: ['14.1', '14.2', '14.3', '14.4', '14.5', '14.6', '14.7', '14.8', '14.9'],
      iso_27001: ['A.6.1', 'A.6.2', 'A.6.3', 'A.6.4', 'A.6.5', 'A.6.6', 'A.6.7', 'A.6.8', 'A.5.10'],
      mitre_attack: ['T1566', 'T1204', 'T1078'],
    },
  },
  {
    id: 'iam-policy',
    title: 'Identity & Access Management Policy',
    type: 'policy',
    description: 'Establishes requirements for managing user identities, authentication, and access to organizational resources.',
    keyTopics: ['JML (Joiners/Movers/Leavers)', 'MFA', 'Access provisioning', 'Privileged access', 'Access reviews', 'Remote access'],
    sections: [
      { title: 'Purpose & Objectives', description: 'Purpose of identity and access management' },
      { title: 'Scope', description: 'Systems and users covered by this policy' },
      { title: 'Identity Lifecycle', description: 'Joiner, mover, and leaver processes' },
      { title: 'Authentication Requirements', description: 'Password policy, MFA requirements' },
      { title: 'Access Provisioning', description: 'Role-based access, least privilege, need-to-know' },
      { title: 'Privileged Access Management', description: 'Controls for administrative and privileged accounts' },
      { title: 'Access Reviews', description: 'Periodic access certification and recertification' },
      { title: 'Remote Access', description: 'VPN, secure remote access requirements' },
      { title: 'Service Accounts', description: 'Management of non-human identities' },
    ],
    frameworkMappings: {
      nist_sp_800_53: ['AC-1', 'AC-2', 'AC-3', 'AC-5', 'AC-6', 'AC-7', 'AC-17', 'IA-1', 'IA-2', 'IA-4', 'IA-5'],
      cis_controls_v8: ['5.1', '5.2', '5.3', '5.4', '5.5', '5.6', '6.1', '6.2', '6.3', '6.4', '6.5', '6.6', '6.7', '6.8'],
      iso_27001: ['A.5.15', 'A.5.16', 'A.5.17', 'A.5.18', 'A.8.2', 'A.8.3', 'A.8.4', 'A.8.5'],
      mitre_attack: ['T1078', 'T1110', 'T1556', 'T1098'],
    },
  },
  {
    id: 'asset-data-protection-policy',
    title: 'Asset & Data Protection Policy',
    type: 'policy',
    description: 'Defines requirements for asset inventory, data classification, handling, and protection throughout the data lifecycle.',
    keyTopics: ['Asset inventory', 'Ownership', 'Data classification', 'Data handling', 'Retention & disposal', 'Privacy/PII'],
    sections: [
      { title: 'Purpose & Objectives', description: 'Purpose of asset and data protection' },
      { title: 'Scope', description: 'Assets and data types covered' },
      { title: 'Asset Inventory', description: 'Requirements for maintaining asset registers' },
      { title: 'Asset Ownership', description: 'Asset owner responsibilities' },
      { title: 'Data Classification', description: 'Classification levels and criteria' },
      { title: 'Data Handling', description: 'Handling requirements by classification level' },
      { title: 'Data Retention', description: 'Retention periods and requirements' },
      { title: 'Data Disposal', description: 'Secure deletion and destruction requirements' },
      { title: 'Privacy & PII', description: 'Personal data protection requirements' },
    ],
    frameworkMappings: {
      nist_sp_800_53: ['CM-8', 'MP-1', 'MP-2', 'MP-3', 'MP-4', 'MP-5', 'MP-6', 'RA-2', 'SI-12'],
      cis_controls_v8: ['1.1', '1.2', '1.3', '1.4', '1.5', '3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.7', '3.8', '3.9', '3.10', '3.11', '3.12'],
      iso_27001: ['A.5.9', 'A.5.10', 'A.5.11', 'A.5.12', 'A.5.13', 'A.5.14', 'A.7.10', 'A.7.14', 'A.8.10'],
      mitre_attack: ['T1005', 'T1025', 'T1039', 'T1114', 'T1119'],
    },
  },
  {
    id: 'secure-operations-policy',
    title: 'Secure Operations Policy',
    type: 'policy',
    description: 'Covers operational security including logging, vulnerability management, change management, and malware protection.',
    keyTopics: ['Logging & monitoring', 'Vulnerability & patch mgmt', 'Change & configuration mgmt', 'Network security', 'Malware protection', 'Backups'],
    sections: [
      { title: 'Purpose & Objectives', description: 'Purpose of secure operations' },
      { title: 'Scope', description: 'Systems and operations covered' },
      { title: 'Logging & Monitoring', description: 'Logging requirements and monitoring procedures' },
      { title: 'Vulnerability Management', description: 'Vulnerability scanning and remediation' },
      { title: 'Patch Management', description: 'Patching timelines and procedures' },
      { title: 'Change Management', description: 'Change control process and approvals' },
      { title: 'Configuration Management', description: 'Baseline configurations and hardening' },
      { title: 'Network Security', description: 'Network segmentation and access controls' },
      { title: 'Malware Protection', description: 'Anti-malware requirements' },
      { title: 'Backup & Recovery', description: 'Backup requirements and testing' },
    ],
    frameworkMappings: {
      nist_sp_800_53: ['AU-1', 'AU-2', 'AU-3', 'AU-6', 'CM-1', 'CM-2', 'CM-3', 'CM-6', 'RA-5', 'SI-2', 'SI-3', 'SI-4', 'CP-9'],
      cis_controls_v8: ['4.1', '4.2', '4.3', '4.4', '4.5', '4.6', '4.7', '7.1', '7.2', '7.3', '7.4', '7.5', '7.6', '7.7', '8.1', '8.2', '8.3', '8.4', '8.5', '8.6', '8.7', '8.8', '8.9', '8.10', '8.11', '10.1', '10.2', '10.3', '10.4', '10.5', '11.1', '11.2', '11.3', '11.4', '11.5'],
      iso_27001: ['A.5.23', 'A.5.24', 'A.5.25', 'A.5.26', 'A.5.28', 'A.8.6', 'A.8.7', 'A.8.8', 'A.8.9', 'A.8.13', 'A.8.15', 'A.8.16', 'A.8.17'],
      mitre_attack: ['T1190', 'T1133', 'T1059', 'T1547', 'T1562'],
    },
  },
  {
    id: 'incident-crisis-policy',
    title: 'Incident & Crisis Management Policy',
    type: 'policy',
    description: 'Defines how security incidents are reported, triaged, responded to, and communicated, including lessons learned.',
    keyTopics: ['Incident reporting', 'Triage', 'Response', 'Communications', 'Evidence handling', 'Lessons learned'],
    sections: [
      { title: 'Purpose & Objectives', description: 'Purpose of incident and crisis management' },
      { title: 'Scope', description: 'Incident types and severity levels covered' },
      { title: 'Incident Classification', description: 'Severity levels and classification criteria' },
      { title: 'Incident Reporting', description: 'How to report incidents and timelines' },
      { title: 'Triage & Assessment', description: 'Initial assessment and prioritization' },
      { title: 'Response Procedures', description: 'Containment, eradication, and recovery steps' },
      { title: 'Communications', description: 'Internal and external communication requirements' },
      { title: 'Evidence Handling', description: 'Evidence preservation and chain of custody' },
      { title: 'Crisis Escalation', description: 'Criteria and process for crisis declaration' },
      { title: 'Post-Incident Review', description: 'Lessons learned and improvement actions' },
    ],
    frameworkMappings: {
      nist_sp_800_53: ['IR-1', 'IR-2', 'IR-3', 'IR-4', 'IR-5', 'IR-6', 'IR-7', 'IR-8'],
      cis_controls_v8: ['17.1', '17.2', '17.3', '17.4', '17.5', '17.6', '17.7', '17.8', '17.9'],
      iso_27001: ['A.5.24', 'A.5.25', 'A.5.26', 'A.5.27', 'A.5.28', 'A.6.8'],
      mitre_attack: ['T1486', 'T1490', 'T1561', 'T1529'],
    },
  },
  {
    id: 'bcdr-policy',
    title: 'Business Continuity & Disaster Recovery Policy',
    type: 'policy',
    description: 'Establishes requirements for business continuity planning, disaster recovery, and resilience testing.',
    keyTopics: ['BIA linkage', 'RTO/RPO targets', 'Recovery strategies', 'Backup/restore testing', 'DR exercises'],
    sections: [
      { title: 'Purpose & Objectives', description: 'Purpose of BC/DR program' },
      { title: 'Scope', description: 'Business functions and systems covered' },
      { title: 'Business Impact Analysis', description: 'BIA requirements and linkage' },
      { title: 'Recovery Objectives', description: 'RTO, RPO, and MTPD definitions' },
      { title: 'Recovery Strategies', description: 'Strategies for different scenario types' },
      { title: 'Backup Requirements', description: 'Backup frequency, retention, and offsite storage' },
      { title: 'Recovery Testing', description: 'Testing types, frequency, and acceptance criteria' },
      { title: 'DR Exercises', description: 'Tabletop and full-scale exercise requirements' },
      { title: 'Plan Maintenance', description: 'Plan review and update schedule' },
    ],
    frameworkMappings: {
      nist_sp_800_53: ['CP-1', 'CP-2', 'CP-3', 'CP-4', 'CP-6', 'CP-7', 'CP-8', 'CP-9', 'CP-10'],
      cis_controls_v8: ['11.1', '11.2', '11.3', '11.4', '11.5'],
      iso_27001: ['A.5.29', 'A.5.30', 'A.8.13', 'A.8.14'],
      mitre_attack: ['T1486', 'T1490', 'T1561'],
    },
  },
  {
    id: 'supplier-vendor-policy',
    title: 'Supplier/Vendor Security Policy',
    type: 'policy',
    description: 'Defines requirements for third-party risk management including due diligence, contracts, and ongoing monitoring.',
    keyTopics: ['Due diligence', 'Contract/security clauses', 'Vendor onboarding/offboarding', 'Monitoring', 'Shared responsibility'],
    sections: [
      { title: 'Purpose & Objectives', description: 'Purpose of supplier security management' },
      { title: 'Scope', description: 'Types of suppliers and relationships covered' },
      { title: 'Supplier Classification', description: 'Risk-based tiering of suppliers' },
      { title: 'Due Diligence', description: 'Security assessment requirements before engagement' },
      { title: 'Contract Requirements', description: 'Security clauses and SLAs' },
      { title: 'Vendor Onboarding', description: 'Security requirements for onboarding' },
      { title: 'Ongoing Monitoring', description: 'Periodic assessments and performance monitoring' },
      { title: 'Shared Responsibility', description: 'Clarity on security responsibilities' },
      { title: 'Vendor Offboarding', description: 'Secure termination procedures' },
      { title: 'Sub-Contractors', description: 'Requirements for supplier sub-contractors' },
    ],
    frameworkMappings: {
      nist_sp_800_53: ['SA-1', 'SA-4', 'SA-9', 'SA-12', 'SR-1', 'SR-2', 'SR-3', 'SR-5', 'SR-6'],
      cis_controls_v8: ['15.1', '15.2', '15.3', '15.4', '15.5', '15.6', '15.7'],
      iso_27001: ['A.5.19', 'A.5.20', 'A.5.21', 'A.5.22', 'A.5.23'],
      mitre_attack: ['T1195', 'T1199'],
    },
  },
  {
    id: 'secure-development-policy',
    title: 'Secure Development Policy',
    type: 'policy',
    description: 'Establishes secure software development lifecycle requirements including threat modeling, code review, and security testing.',
    keyTopics: ['SDLC controls', 'Threat modeling', 'Code review', 'Security testing', 'Dependency management', 'CI/CD controls'],
    sections: [
      { title: 'Purpose & Objectives', description: 'Purpose of secure development practices' },
      { title: 'Scope', description: 'Applications and development environments covered' },
      { title: 'Secure SDLC', description: 'Security integration throughout the development lifecycle' },
      { title: 'Threat Modeling', description: 'Requirements for threat modeling activities' },
      { title: 'Secure Coding', description: 'Secure coding standards and guidelines' },
      { title: 'Code Review', description: 'Peer review and security review requirements' },
      { title: 'Dependency Management', description: 'Third-party library and component security' },
      { title: 'Security Testing', description: 'SAST, DAST, and penetration testing requirements' },
      { title: 'CI/CD Security', description: 'Pipeline security controls and approvals' },
      { title: 'Deployment Controls', description: 'Secure deployment and release management' },
    ],
    frameworkMappings: {
      nist_sp_800_53: ['SA-1', 'SA-3', 'SA-8', 'SA-10', 'SA-11', 'SA-15', 'SA-16', 'SA-17'],
      cis_controls_v8: ['16.1', '16.2', '16.3', '16.4', '16.5', '16.6', '16.7', '16.8', '16.9', '16.10', '16.11', '16.12', '16.13', '16.14'],
      iso_27001: ['A.8.25', 'A.8.26', 'A.8.27', 'A.8.28', 'A.8.29', 'A.8.30', 'A.8.31', 'A.8.32', 'A.8.33'],
      mitre_attack: ['T1195', 'T1059', 'T1027'],
    },
  },
  
  // Standards (referenced by policies)
  {
    id: 'cryptography-standard',
    title: 'Cryptography & Key Management Standard',
    type: 'standard',
    description: 'Specifies mandatory requirements for encryption, key management, and certificate handling.',
    keyTopics: ['Encryption in transit/at rest', 'Key ownership/rotation', 'Certificate management'],
    sections: [
      { title: 'Purpose', description: 'Purpose of this cryptographic standard' },
      { title: 'Scope', description: 'Systems and data requiring encryption' },
      { title: 'Encryption Requirements', description: 'Approved algorithms, key lengths, and protocols' },
      { title: 'Data at Rest', description: 'Encryption requirements for stored data' },
      { title: 'Data in Transit', description: 'Encryption requirements for transmitted data' },
      { title: 'Key Generation', description: 'Key generation requirements and procedures' },
      { title: 'Key Storage', description: 'Secure key storage requirements' },
      { title: 'Key Rotation', description: 'Key rotation schedules and procedures' },
      { title: 'Key Destruction', description: 'Secure key destruction requirements' },
      { title: 'Certificate Management', description: 'Certificate lifecycle and renewal' },
      { title: 'Compliance Verification', description: 'How compliance with this standard is verified' },
    ],
    frameworkMappings: {
      nist_sp_800_53: ['SC-8', 'SC-12', 'SC-13', 'SC-17', 'SC-28'],
      cis_controls_v8: ['3.10', '3.11'],
      iso_27001: ['A.8.24'],
      mitre_attack: ['T1573', 'T1022'],
    },
  },
  {
    id: 'hardening-standard',
    title: 'Secure Configuration & Hardening Standard',
    type: 'standard',
    description: 'Specifies baseline security configurations, approved services, and configuration drift controls.',
    keyTopics: ['Baseline configs', 'Approved services', 'Configuration drift controls'],
    sections: [
      { title: 'Purpose', description: 'Purpose of secure configuration' },
      { title: 'Scope', description: 'Systems and platforms covered' },
      { title: 'Baseline Configurations', description: 'Required baseline security configurations' },
      { title: 'Operating Systems', description: 'OS hardening requirements' },
      { title: 'Network Devices', description: 'Network device hardening requirements' },
      { title: 'Databases', description: 'Database hardening requirements' },
      { title: 'Cloud Services', description: 'Cloud platform hardening requirements' },
      { title: 'Approved Services', description: 'Approved and prohibited services/ports' },
      { title: 'Configuration Drift', description: 'Drift detection and remediation' },
      { title: 'Exceptions', description: 'Exception process for deviations' },
      { title: 'Compliance Verification', description: 'How compliance with this standard is verified' },
    ],
    frameworkMappings: {
      nist_sp_800_53: ['CM-2', 'CM-6', 'CM-7', 'CM-8', 'CM-9', 'SC-7'],
      cis_controls_v8: ['4.1', '4.2', '4.3', '4.4', '4.5', '4.6', '4.7', '4.8', '4.9', '4.10', '4.11', '4.12'],
      iso_27001: ['A.8.9', 'A.8.19', 'A.8.20', 'A.8.21', 'A.8.22'],
      mitre_attack: ['T1562', 'T1548', 'T1112'],
    },
  },
];

// Get icon for document type
export function getDocumentTypeIcon(type: DocumentTemplateType) {
  switch (type) {
    case 'policy':
      return BookOpen;
    case 'standard':
      return ScrollText;
    case 'procedure':
      return ClipboardList;
    default:
      return BookOpen;
  }
}

// Get all framework references as a formatted string
export function formatFrameworkMappings(mappings: FrameworkMapping): string {
  const parts: string[] = [];
  if (mappings.iso_27001?.length) {
    parts.push(`ISO 27001: ${mappings.iso_27001.slice(0, 3).join(', ')}${mappings.iso_27001.length > 3 ? '...' : ''}`);
  }
  if (mappings.nist_sp_800_53?.length) {
    parts.push(`NIST: ${mappings.nist_sp_800_53.slice(0, 2).join(', ')}${mappings.nist_sp_800_53.length > 2 ? '...' : ''}`);
  }
  if (mappings.cis_controls_v8?.length) {
    parts.push(`CIS: ${mappings.cis_controls_v8.slice(0, 2).join(', ')}${mappings.cis_controls_v8.length > 2 ? '...' : ''}`);
  }
  return parts.join(' | ');
}
