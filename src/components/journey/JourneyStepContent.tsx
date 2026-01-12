import React from 'react';

interface StepContentData {
  content: React.ReactNode;
  actions: { label: string; description: string }[];
}

export const getStepContent = (stepId: number): StepContentData => {
  const contentMap: Record<number, StepContentData> = {
    1: {
      content: (
        <div>
          <p>
            The <strong>Governance</strong> module is your foundation for establishing organizational security policies
            and structure. Here you'll define your company profile, create scope statements for compliance, and manage
            security policies.
          </p>
          <p className="mt-2">
            Start by setting up your company profile with basic information, then define the scope of your security
            program through scope statements.
          </p>
        </div>
      ),
      actions: [
        { label: 'Set up Company Profile', description: 'Enter your organization details' },
        { label: 'Create Scope Statement', description: 'Define what\'s in scope for security' },
        { label: 'Review Policies', description: 'Create or import security policies' },
      ],
    },
    2: {
      content: (
        <div>
          <p>
            <strong>Asset Management</strong> helps you maintain an inventory of all assets that need protection.
            Primary assets are business processes and information, while secondary assets are the technology and
            facilities that support them.
          </p>
          <p className="mt-2">
            Proper asset classification is essential for effective risk management and control implementation.
          </p>
        </div>
      ),
      actions: [
        { label: 'Add Primary Assets', description: 'Business processes, data, information' },
        { label: 'Add Secondary Assets', description: 'Systems, applications, infrastructure' },
        { label: 'Map Relationships', description: 'Link assets to show dependencies' },
      ],
    },
    3: {
      content: (
        <div>
          <p>
            <strong>Risk Management</strong> is where you identify, assess, and treat security risks. The risk
            register tracks all identified risks, while risk appetite defines your organization's tolerance levels.
          </p>
          <p className="mt-2">
            Use the risk matrix to visualize risks by likelihood and impact, then create treatment plans for
            risks that exceed your appetite thresholds.
          </p>
        </div>
      ),
      actions: [
        { label: 'Define Risk Appetite', description: 'Set acceptable risk thresholds' },
        { label: 'Add Risks', description: 'Identify and document security risks' },
        { label: 'Create Treatments', description: 'Plan how to mitigate unacceptable risks' },
      ],
    },
    4: {
      content: (
        <div>
          <p>
            The <strong>Control Library</strong> manages both internal controls and external framework controls
            (like NIST, ISO 27001, CIS). Map your internal controls to framework requirements to demonstrate
            compliance.
          </p>
          <p className="mt-2">
            Import control frameworks, create internal controls, and establish mappings to track your compliance posture.
          </p>
        </div>
      ),
      actions: [
        { label: 'Import Framework', description: 'Add NIST, ISO, or other frameworks' },
        { label: 'Create Internal Controls', description: 'Document your security controls' },
        { label: 'Map Controls', description: 'Link internal controls to framework requirements' },
      ],
    },
    5: {
      content: (
        <div>
          <p>
            <strong>Vendor Management</strong> helps you track and assess third-party risks. Every vendor that
            handles your data or has access to your systems represents potential risk.
          </p>
          <p className="mt-2">
            Document vendors, assess their security posture, and track contract details and review dates.
          </p>
        </div>
      ),
      actions: [
        { label: 'Add Vendors', description: 'Document third-party relationships' },
        { label: 'Assess Risk', description: 'Evaluate vendor security posture' },
        { label: 'Track Contracts', description: 'Monitor contract dates and terms' },
      ],
    },
    6: {
      content: (
        <div>
          <p>
            <strong>Business Continuity</strong> ensures your organization can recover from disruptions. The Business
            Impact Assessment (BIA) helps prioritize recovery based on how quickly different processes become critical.
          </p>
          <p className="mt-2">
            Define RTO (Recovery Time Objective) and RPO (Recovery Point Objective) for your critical assets.
          </p>
        </div>
      ),
      actions: [
        { label: 'Create BIA', description: 'Assess impact of asset unavailability' },
        { label: 'Set Recovery Objectives', description: 'Define RTO and RPO values' },
        { label: 'Document Plans', description: 'Create continuity and recovery plans' },
      ],
    },
    7: {
      content: (
        <div>
          <p>
            <strong>Data Protection</strong> focuses on classifying data by sensitivity and ensuring appropriate
            protections are applied. Define confidentiality levels that match your organization's needs.
          </p>
          <p className="mt-2">
            Link confidentiality levels to impact levels to ensure consistent risk treatment.
          </p>
        </div>
      ),
      actions: [
        { label: 'Define Levels', description: 'Create confidentiality classification levels' },
        { label: 'Link to Impact', description: 'Connect levels to risk impact ratings' },
        { label: 'Apply to Assets', description: 'Classify assets by sensitivity' },
      ],
    },
    8: {
      content: (
        <div>
          <p>
            <strong>Maturity Assessment</strong> tracks your security program's capability maturity over time.
            Assess your current state, identify gaps, and track improvement initiatives.
          </p>
          <p className="mt-2">
            Regular maturity assessments help demonstrate continuous improvement to stakeholders and auditors.
          </p>
        </div>
      ),
      actions: [
        { label: 'Run Assessment', description: 'Evaluate current maturity levels' },
        { label: 'Identify Gaps', description: 'Find areas needing improvement' },
        { label: 'Track Progress', description: 'Monitor maturity over time' },
      ],
    },
    9: {
      content: (
        <div>
          <p>
            <strong>Security Operations</strong> manages active security monitoring and response. This includes
            threat intelligence, vulnerability management, security tools inventory, and incident response team
            (SIRT) coordination.
          </p>
          <p className="mt-2">
            Document threat sources, predisposing conditions, and vulnerabilities to support detailed risk analysis.
          </p>
        </div>
      ),
      actions: [
        { label: 'Add Security Tools', description: 'Document your security technology stack' },
        { label: 'Configure SIRT', description: 'Set up incident response team' },
        { label: 'Manage Threats', description: 'Track threat sources and vulnerabilities' },
      ],
    },
    10: {
      content: (
        <div>
          <p>
            <strong>AI Governance</strong> helps you manage AI systems and ensure compliance with regulations like
            the EU AI Act. Track AI assets, document use cases, and assess risk categories.
          </p>
          <p className="mt-2">
            As AI becomes more prevalent, proper governance ensures responsible and compliant AI deployment.
          </p>
        </div>
      ),
      actions: [
        { label: 'Register AI Assets', description: 'Document AI/ML systems in use' },
        { label: 'Define Use Cases', description: 'Describe how AI is being used' },
        { label: 'Assess Risk Category', description: 'Classify per EU AI Act requirements' },
      ],
    },
    11: {
      content: (
        <div>
          <p>
            <strong>Data Forge</strong> is your integration hub for importing and exporting data. Connect to external
            systems, import spreadsheets, or set up automated data synchronization.
          </p>
          <p className="mt-2">
            Use Data Forge to migrate existing GRC data or integrate with other tools in your security stack.
          </p>
        </div>
      ),
      actions: [
        { label: 'Import Data', description: 'Bring in data from spreadsheets or APIs' },
        { label: 'Create Connections', description: 'Set up integrations with other tools' },
        { label: 'Configure Sync', description: 'Automate data updates' },
      ],
    },
    12: {
      content: (
        <div>
          <p>
            🎉 <strong>Congratulations!</strong> You've completed the Security Journey and learned about all the
            modules available in SecIX.
          </p>
          <p className="mt-2">
            Remember, you can always use the AI Assistant (bottom-right corner) if you have questions about any
            feature or need guidance on GRC best practices.
          </p>
          <p className="mt-2">
            Your dashboard is now your command center for monitoring your security posture. Good luck on your
            GRC journey!
          </p>
        </div>
      ),
      actions: [],
    },
  };

  return contentMap[stepId] || { content: null, actions: [] };
};
