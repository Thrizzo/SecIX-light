/**
 * Suggest Risk Content - Docker/Kubernetes Version
 * Uses AI provider abstraction for Ollama/OpenAI support
 * Matches the SaaS edge function API
 */

import { chatCompletion } from '../../lib/ai-provider.js';

export default async function handler(body, context) {
  const pool = context.pool;

  try {
    const { type, category_name, category_description, worst_case, levels_count = 5, companyContext } = body;

    const contextPrefix = companyContext ? `[ORGANIZATIONAL CONTEXT]
${companyContext}

Tailor your response to this organization's context where relevant.

` : '';

    let systemPrompt = '';
    let userPrompt = '';

    switch (type) {
      case 'worst-case':
        systemPrompt = `${contextPrefix}You are a risk management expert. Generate realistic worst-case scenarios for organizational risk categories. Be specific, actionable, and consider regulatory, financial, operational, and reputational impacts.`;
        userPrompt = `Generate a worst-case scenario description for the risk category "${category_name}"${category_description ? ` (${category_description})` : ''}.

The scenario should:
- Be specific and realistic
- Include potential financial, operational, and reputational impacts
- Be 2-4 sentences long
- Consider regulatory and compliance implications where relevant

Respond with just the scenario text, no preamble or explanation.`;
        break;

      case 'impact-descriptions':
        systemPrompt = `${contextPrefix}You are a risk management expert. Generate impact level descriptions that help risk assessors consistently evaluate risk severity across different categories.`;
        userPrompt = `Generate ${levels_count} impact level descriptions for the risk category "${category_name}"${category_description ? ` (${category_description})` : ''}.

${worst_case ? `The worst-case scenario (highest impact level) is: "${worst_case}"` : ''}

Generate descriptions from level 1 (lowest/negligible) to level ${levels_count} (highest/catastrophic).
Each description should be specific to ${category_name} and help assessors determine which level applies.

Respond with a JSON array of ${levels_count} strings, one for each level from lowest to highest.
Example format: ["Negligible impact...", "Minor impact...", ..., "Catastrophic impact..."]`;
        break;

      case 'likelihood-descriptions':
        systemPrompt = `${contextPrefix}You are a risk management expert. Generate likelihood level labels and descriptions that help risk assessors consistently evaluate the probability of risks occurring.`;
        userPrompt = `Generate ${levels_count} likelihood levels with labels and descriptions.

Generate from level 1 (least likely) to level ${levels_count} (most likely).
Each should have a clear label and a description that helps assessors determine probability.

Respond with a JSON array of objects with "label" and "description" fields.
Example format: [{"label": "Rare", "description": "Less than once per decade"}, ...]`;
        break;

      case 'narrative-statement':
        systemPrompt = `${contextPrefix}You are a risk management expert specializing in enterprise risk appetite statements. Generate professional, board-ready risk appetite narrative statements.`;
        userPrompt = `Generate a risk appetite narrative statement for an organization with the following configuration:

${category_name ? `Categories: ${category_name}` : ''}
${worst_case ? `Context: ${worst_case}` : ''}
Matrix size: ${levels_count}x${levels_count}

The statement should:
- Be 3-5 sentences long
- Articulate the organization's overall tolerance for risk
- Reference the balance between risk-taking and risk mitigation
- Be suitable for board-level documentation
- Use professional, clear language

Respond with just the narrative statement text, no preamble.`;
        break;

      case 'escalation-criteria':
        systemPrompt = `${contextPrefix}You are a risk management expert. Generate clear escalation criteria that define when and how risks should be escalated within an organization.`;
        userPrompt = `Generate escalation criteria for a risk appetite framework with the following configuration:

${category_name ? `Risk categories: ${category_name}` : ''}
Matrix size: ${levels_count}x${levels_count}
${worst_case ? `Additional context: ${worst_case}` : ''}

The criteria should:
- Define clear triggers for escalation (score thresholds, severity levels)
- Specify escalation paths (e.g., manager → executive → board)
- Include timeframes for escalation actions
- Be 3-6 sentences covering different scenarios
- Be actionable and unambiguous

Respond with just the escalation criteria text, no preamble.`;
        break;

      case 'privacy-constraints':
        systemPrompt = `${contextPrefix}You are a privacy and compliance expert. Generate privacy constraint statements for enterprise risk frameworks.`;
        userPrompt = `Generate privacy constraints for a risk appetite framework.

The constraints should:
- Reference relevant privacy regulations (GDPR, CCPA, etc.)
- Define data handling requirements
- Specify restrictions on risk data sharing
- Be 2-4 sentences
- Be practical and enforceable

Respond with just the privacy constraints text, no preamble.`;
        break;

      case 'security-constraints':
        systemPrompt = `${contextPrefix}You are a cybersecurity and risk management expert. Generate security constraint statements for enterprise risk frameworks based on industry standards like NIST, CIS Controls, and ISO 27001.`;
        userPrompt = `Generate security constraints for a risk appetite framework.

The constraints should:
- Reference relevant security frameworks (NIST SP 800-53, CIS Controls v8.1, ISO 27001, MITRE ATT&CK)
- Define security control requirements and acceptable risk thresholds
- Specify restrictions on security-related risk acceptance
- Include considerations for cyber risk, access controls, and incident response
- Be 2-4 sentences
- Be practical and enforceable

Respond with just the security constraints text, no preamble.`;
        break;

      default:
        return { error: `Unknown suggestion type: ${type}` };
    }

    console.log(`Generating ${type} suggestion for: ${category_name || 'general'}`);

    const content = await chatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }, pool);

    let response;

    if (type === 'worst-case' || type === 'narrative-statement' || type === 'escalation-criteria' || type === 'privacy-constraints' || type === 'security-constraints') {
      response = { suggestion: content.trim() };
    } else {
      // Parse JSON array from response
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          response = { suggestions: JSON.parse(jsonMatch[0]) };
        } else {
          throw new Error('No JSON array found in response');
        }
      } catch (parseError) {
        console.error('Failed to parse AI response:', content);
        return { error: 'Failed to parse AI response' };
      }
    }

    console.log(`Successfully generated ${type} suggestion`);

    return response;
  } catch (error) {
    console.error('suggest-risk-content error:', error);
    return { error: error.message };
  }
}
