/**
 * Regulatory Compliance Check for SecIX Light
 * Analyzes GRC data against regulatory requirements (NIS2, DORA, HIPAA, PCI DSS, SOX)
 */

import { chatCompletion } from '../../lib/ai-provider.js';

const REGULATIONS = {
  NIS2: {
    name: 'NIS2 Directive',
    articles: [
      { id: 'Art.20', title: 'Governance', description: 'Management body oversight and accountability for cybersecurity' },
      { id: 'Art.21', title: 'Cybersecurity risk-management measures', description: 'Technical, operational and organisational measures' },
      { id: 'Art.21.2a', title: 'Risk analysis and security policies', description: 'Policies on risk analysis and information system security' },
      { id: 'Art.21.2b', title: 'Incident handling', description: 'Incident handling procedures' },
      { id: 'Art.21.2c', title: 'Business continuity', description: 'Business continuity and crisis management' },
      { id: 'Art.21.2d', title: 'Supply chain security', description: 'Supply chain security including security-related aspects' },
      { id: 'Art.21.2e', title: 'Security in network and information systems', description: 'Security in acquisition, development and maintenance' },
      { id: 'Art.21.2f', title: 'Vulnerability handling', description: 'Policies and procedures for vulnerability handling and disclosure' },
      { id: 'Art.21.2g', title: 'Effectiveness assessment', description: 'Policies and procedures to assess the effectiveness of cybersecurity measures' },
      { id: 'Art.21.2h', title: 'Cybersecurity training', description: 'Basic cyber hygiene practices and cybersecurity training' },
      { id: 'Art.21.2i', title: 'Cryptography', description: 'Policies and procedures regarding the use of cryptography' },
      { id: 'Art.21.2j', title: 'HR security', description: 'Human resources security, access control policies and asset management' },
      { id: 'Art.21.2k', title: 'Multi-factor authentication', description: 'Use of multi-factor authentication or continuous authentication' },
      { id: 'Art.23', title: 'Reporting obligations', description: 'Incident notification requirements' },
    ]
  },
  DORA: {
    name: 'Digital Operational Resilience Act',
    articles: [
      { id: 'Art.5', title: 'ICT Risk Management Framework', description: 'Comprehensive ICT risk management framework' },
      { id: 'Art.6', title: 'ICT systems and tools', description: 'ICT systems, protocols and tools requirements' },
      { id: 'Art.7', title: 'Identification', description: 'Identification of ICT risks and critical functions' },
      { id: 'Art.8', title: 'Protection and prevention', description: 'Protection and prevention measures' },
      { id: 'Art.9', title: 'Detection', description: 'Detection of anomalous activities' },
      { id: 'Art.10', title: 'Response and recovery', description: 'Response and recovery policies' },
      { id: 'Art.11', title: 'Backup policies', description: 'Backup policies and procedures' },
      { id: 'Art.12', title: 'Learning and evolving', description: 'Learning from incidents and testing' },
      { id: 'Art.13', title: 'Communication', description: 'Communication policies' },
      { id: 'Art.17', title: 'ICT incident classification', description: 'Classification of ICT-related incidents' },
      { id: 'Art.19', title: 'Incident reporting', description: 'Reporting of major ICT incidents' },
      { id: 'Art.24', title: 'Digital operational resilience testing', description: 'General requirements for testing' },
      { id: 'Art.25', title: 'Testing of ICT tools', description: 'Testing of ICT tools and systems' },
      { id: 'Art.26', title: 'Threat-led penetration testing', description: 'Advanced testing requirements' },
      { id: 'Art.28', title: 'Third-party risk management', description: 'General principles for third-party ICT risk' },
      { id: 'Art.29', title: 'Preliminary assessment', description: 'Preliminary assessment of ICT concentration risk' },
      { id: 'Art.30', title: 'Key contractual provisions', description: 'Key contractual provisions for ICT services' },
    ]
  },
  HIPAA: {
    name: 'Health Insurance Portability and Accountability Act',
    articles: [
      { id: '164.308(a)(1)', title: 'Security Management Process', description: 'Implement policies to prevent, detect, contain and correct security violations' },
      { id: '164.308(a)(2)', title: 'Assigned Security Responsibility', description: 'Identify the security official responsible for policies and procedures' },
      { id: '164.308(a)(3)', title: 'Workforce Security', description: 'Implement policies to ensure appropriate access to ePHI' },
      { id: '164.308(a)(4)', title: 'Information Access Management', description: 'Implement policies for authorizing access to ePHI' },
      { id: '164.308(a)(5)', title: 'Security Awareness and Training', description: 'Implement security awareness and training program' },
      { id: '164.308(a)(6)', title: 'Security Incident Procedures', description: 'Implement policies to address security incidents' },
      { id: '164.308(a)(7)', title: 'Contingency Plan', description: 'Establish policies for responding to emergencies' },
      { id: '164.308(a)(8)', title: 'Evaluation', description: 'Perform periodic technical and nontechnical evaluations' },
      { id: '164.310(a)(1)', title: 'Facility Access Controls', description: 'Limit physical access to electronic information systems' },
      { id: '164.310(b)', title: 'Workstation Use', description: 'Implement policies for workstation use' },
      { id: '164.310(c)', title: 'Workstation Security', description: 'Implement physical safeguards for workstations' },
      { id: '164.310(d)(1)', title: 'Device and Media Controls', description: 'Implement policies for hardware and electronic media' },
      { id: '164.312(a)(1)', title: 'Access Control', description: 'Implement technical policies for electronic information systems' },
      { id: '164.312(b)', title: 'Audit Controls', description: 'Implement mechanisms to record and examine activity' },
      { id: '164.312(c)(1)', title: 'Integrity', description: 'Implement policies to protect ePHI from improper alteration' },
      { id: '164.312(d)', title: 'Person or Entity Authentication', description: 'Implement procedures to verify identity' },
      { id: '164.312(e)(1)', title: 'Transmission Security', description: 'Implement technical security measures for ePHI transmission' },
    ]
  },
  PCI_DSS: {
    name: 'Payment Card Industry Data Security Standard',
    articles: [
      { id: 'Req.1', title: 'Install and maintain network security controls', description: 'Network security controls (firewalls, etc.)' },
      { id: 'Req.2', title: 'Apply secure configurations', description: 'Secure configurations to all system components' },
      { id: 'Req.3', title: 'Protect stored account data', description: 'Protection of stored cardholder data' },
      { id: 'Req.4', title: 'Protect cardholder data with strong cryptography', description: 'Strong cryptography during transmission' },
      { id: 'Req.5', title: 'Protect systems from malicious software', description: 'Anti-malware solutions' },
      { id: 'Req.6', title: 'Develop and maintain secure systems', description: 'Secure development practices' },
      { id: 'Req.7', title: 'Restrict access by business need to know', description: 'Access control by business need' },
      { id: 'Req.8', title: 'Identify users and authenticate access', description: 'User identification and authentication' },
      { id: 'Req.9', title: 'Restrict physical access', description: 'Physical access to cardholder data' },
      { id: 'Req.10', title: 'Log and monitor access', description: 'Logging and monitoring of all access' },
      { id: 'Req.11', title: 'Test security of systems and networks', description: 'Regular testing of security systems' },
      { id: 'Req.12', title: 'Information security policies', description: 'Support information security with policies and programs' },
    ]
  },
  SOX: {
    name: 'Sarbanes-Oxley Act',
    articles: [
      { id: 'Sec.302', title: 'Corporate Responsibility for Financial Reports', description: 'CEO and CFO certification of financial reports accuracy' },
      { id: 'Sec.404', title: 'Management Assessment of Internal Controls', description: 'Annual assessment and report on internal controls over financial reporting' },
      { id: 'Sec.404(b)', title: 'External Auditor Attestation', description: 'Independent auditor attestation on internal control effectiveness' },
      { id: 'Sec.409', title: 'Real-Time Disclosure', description: 'Rapid and current disclosure of material changes in financial condition' },
      { id: 'Sec.802', title: 'Document Retention', description: 'Criminal penalties for alteration or destruction of documents' },
      { id: 'COSO.Control-Environment', title: 'Control Environment', description: 'Tone at the top, integrity, ethical values, and governance structure' },
      { id: 'COSO.Risk-Assessment', title: 'Risk Assessment', description: 'Identification and analysis of risks to achieving objectives' },
      { id: 'COSO.Control-Activities', title: 'Control Activities', description: 'Policies and procedures to address risks and achieve objectives' },
      { id: 'COSO.Information-Communication', title: 'Information and Communication', description: 'Relevant information identified, captured, and communicated' },
      { id: 'COSO.Monitoring', title: 'Monitoring Activities', description: 'Ongoing and separate evaluations of internal control effectiveness' },
      { id: 'ITGC.Access-Controls', title: 'IT Access Controls', description: 'Logical and physical access controls for IT systems' },
      { id: 'ITGC.Change-Management', title: 'IT Change Management', description: 'Controls over changes to IT systems and applications' },
      { id: 'ITGC.Computer-Operations', title: 'IT Computer Operations', description: 'Batch processing, backup, recovery, and job scheduling controls' },
      { id: 'ITGC.Program-Development', title: 'IT Program Development', description: 'Controls over system development and implementation' },
    ]
  }
};

async function tableExists(pool, tableName) {
  const res = await pool.query('SELECT to_regclass($1) AS reg', [`public.${tableName}`]);
  return !!res.rows?.[0]?.reg;
}

async function safeQuery(pool, query, params = []) {
  try {
    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.warn(`[regulatory-compliance-check] Query failed: ${error.message}`);
    return [];
  }
}

export default async function handler(body, context) {
  const pool = context.pool;
  const { regulation, forceRefresh } = body;

  console.log('[regulatory-compliance-check] Checking regulation:', regulation);

  try {
    if (!regulation || !REGULATIONS[regulation]) {
      throw new Error('Invalid regulation. Must be one of: NIS2, DORA, HIPAA, PCI_DSS, SOX');
    }

    // Check if cache table exists
    const hasCacheTable = await tableExists(pool, 'regulatory_compliance_cache');

    // Check cache first (unless force refresh)
    if (!forceRefresh && hasCacheTable) {
      const cacheResult = await pool.query(`
        SELECT * FROM public.regulatory_compliance_cache 
        WHERE regulation = $1 AND expires_at > NOW()
        ORDER BY generated_at DESC
        LIMIT 1
      `, [regulation]);

      if (cacheResult.rows.length > 0) {
        console.log(`[regulatory-compliance-check] Returning cached analysis for ${regulation}`);
        return cacheResult.rows[0].analysis_data;
      }
    }

    console.log(`[regulatory-compliance-check] Running fresh AI analysis for ${regulation}`);

    // Fetch GRC data with safe queries (handles missing tables gracefully)
    const [
      internalControls,
      policies,
      frameworks,
      frameworkControls,
      risks,
      primaryAssets,
      secondaryAssets,
      biaAssessments,
      treatments
    ] = await Promise.all([
      safeQuery(pool, "SELECT * FROM public.internal_controls WHERE is_active = true"),
      safeQuery(pool, "SELECT * FROM public.policies"),
      safeQuery(pool, "SELECT * FROM public.control_frameworks WHERE is_active = true"),
      safeQuery(pool, "SELECT fc.*, cf.name as framework_name FROM public.framework_controls fc LEFT JOIN public.control_frameworks cf ON fc.framework_id = cf.id"),
      safeQuery(pool, "SELECT * FROM public.risks WHERE archived = false"),
      safeQuery(pool, "SELECT * FROM public.primary_assets WHERE archived = false"),
      safeQuery(pool, "SELECT * FROM public.secondary_assets WHERE archived = false"),
      safeQuery(pool, "SELECT * FROM public.bia_assessments"),
      safeQuery(pool, "SELECT * FROM public.treatments"),
    ]);

    const regulationInfo = REGULATIONS[regulation];
    
    // Build comprehensive prompt
    const prompt = `You are a regulatory compliance expert. Analyze the organization's GRC (Governance, Risk, and Compliance) data against ${regulationInfo.name} requirements.

## Organization's Current GRC State

### Internal Controls (${internalControls?.length || 0} active):
${internalControls?.map(c => `- ${c.internal_control_code}: ${c.title} - ${c.description || 'No description'} (Status: ${c.implementation_status}, Effectiveness: ${c.effectiveness})`).join('\n') || 'No internal controls defined'}

### Policies (${policies?.length || 0}):
${policies?.map(p => `- ${p.title} (Status: ${p.status})`).join('\n') || 'No policies defined'}

### Implemented Frameworks (${frameworks?.length || 0}):
${frameworks?.map(f => `- ${f.name} v${f.version || '1.0'}`).join('\n') || 'No frameworks implemented'}

### Framework Controls Mapped (${frameworkControls?.length || 0}):
${frameworkControls?.slice(0, 50).map(fc => `- ${fc.control_code}: ${fc.title}`).join('\n') || 'No framework controls'}
${(frameworkControls?.length || 0) > 50 ? `\n... and ${(frameworkControls?.length || 0) - 50} more controls` : ''}

### Risk Management (${risks?.length || 0} active risks):
${risks?.slice(0, 20).map(r => `- ${r.title}: ${r.risk_category || 'Uncategorized'} (Inherent: ${r.inherent_risk_level}, Residual: ${r.residual_risk_level})`).join('\n') || 'No risks registered'}

### Asset Inventory:
- Primary Assets: ${primaryAssets?.length || 0}
- Secondary Assets: ${secondaryAssets?.length || 0}

### Business Impact Assessments: ${biaAssessments?.length || 0}

### Risk Treatments: ${treatments?.length || 0}

## ${regulationInfo.name} Articles to Assess:
${regulationInfo.articles.map(a => `- ${a.id}: ${a.title} - ${a.description}`).join('\n')}

## Your Task:
For each article in ${regulationInfo.name}, analyze if the organization's existing controls, policies, and practices cover the requirement. Return a JSON object with this exact structure:

{
  "regulation": "${regulation}",
  "regulation_name": "${regulationInfo.name}",
  "overall_coverage": <number 0-100>,
  "covered_articles": [
    {
      "article_id": "<article id>",
      "article_title": "<title>",
      "coverage_level": "full" or "partial",
      "mapped_controls": ["<control codes that address this>"],
      "evidence": "<brief explanation of how this is covered>"
    }
  ],
  "gaps": [
    {
      "article_id": "<article id>",
      "article_title": "<title>",
      "description": "<what's missing>",
      "criticality": "critical" or "high" or "medium" or "low",
      "recommendation": "<specific actionable recommendation>",
      "effort_estimate": "<time estimate like '1-2 weeks'>"
    }
  ],
  "summary": {
    "strengths": ["<key strength 1>", "<key strength 2>"],
    "weaknesses": ["<key weakness 1>", "<key weakness 2>"],
    "priority_actions": ["<most urgent action 1>", "<action 2>", "<action 3>"]
  }
}

Be realistic and conservative in your assessment. If there's no clear evidence of coverage, mark it as a gap.`;

    const result = await chatCompletion({
      messages: [
        { role: 'system', content: 'You are a regulatory compliance expert. Always respond with valid JSON only, no markdown formatting.' },
        { role: 'user', content: prompt }
      ],
    }, pool);

    // Parse the JSON response
    let analysisResult;
    try {
      const jsonMatch = result.match(/```json\n?([\s\S]*?)\n?```/) || result.match(/```\n?([\s\S]*?)\n?```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : result;
      analysisResult = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('[regulatory-compliance-check] Failed to parse AI response:', result);
      throw new Error('Failed to parse AI analysis response');
    }

    // Add metadata
    analysisResult.generated_at = new Date().toISOString();

    // Cache the result if table exists
    if (hasCacheTable) {
      try {
        await pool.query(`
          INSERT INTO public.regulatory_compliance_cache 
          (regulation, analysis_data, coverage_percentage, expires_at)
          VALUES ($1, $2, $3, NOW() + INTERVAL '24 hours')
        `, [regulation, JSON.stringify(analysisResult), analysisResult.overall_coverage || 0]);
      } catch (cacheError) {
        console.error('[regulatory-compliance-check] Failed to cache result:', cacheError);
      }
    }

    console.log(`[regulatory-compliance-check] Analysis complete for ${regulation}: ${analysisResult.overall_coverage}% coverage`);

    return analysisResult;
  } catch (error) {
    console.error('[regulatory-compliance-check] Error:', error);
    throw error;
  }
}
