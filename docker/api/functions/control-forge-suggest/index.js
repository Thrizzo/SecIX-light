/**
 * Control Forge Suggest Edge Function for Docker Deployments
 * Generates internal control implementations from framework controls
 */

import { chatCompletion } from '../../lib/ai-provider.js';

export default async function handler(body, context) {
  const pool = context.pool;
  const { frameworkControls, customContext, existingControls, companyContext } = body;

  console.log('[control-forge-suggest] Processing control forge request');

  try {
    const existingControlsList = existingControls?.length > 0
      ? `\nExisting internal controls to be aware of (avoid duplicates):\n${existingControls.map(c => `- ${c.code}: ${c.title}`).join('\n')}`
      : '';

    // Handle multiple controls
    const controlsList = Array.isArray(frameworkControls) ? frameworkControls : [frameworkControls];
    const isMultiControl = controlsList.length > 1;

    const controlsDescription = controlsList.map((ctrl, idx) => `
**Control ${idx + 1}:**
- Code: ${ctrl.code || 'N/A'}
- Framework: ${ctrl.framework || 'Unknown'}
- Title: ${ctrl.title}
- Description: ${ctrl.description || 'Not provided'}
- Guidance: ${ctrl.guidance || 'Not provided'}
- Implementation Guidance: ${ctrl.implementation_guidance || 'Not provided'}
- Domain: ${ctrl.domain || 'Not specified'}
- Security Function: ${ctrl.security_function || 'Not specified'}
`).join('\n');

    const contextPrefix = companyContext ? `[ORGANIZATIONAL CONTEXT]\n${companyContext}\n\nTailor control implementations to this organization's context where relevant.\n\n` : '';

    const systemPrompt = isMultiControl 
      ? `${contextPrefix}You are a security control implementation expert specializing in control harmonization and framework mapping. Your role is to:
1. Analyze multiple framework controls and identify their overlaps and differences
2. Calculate coverage percentages between controls
3. Create unified internal controls that satisfy multiple framework requirements
4. Identify gaps where additional implementation is needed

Respond with valid JSON only, matching this structure:
{
  "coverage_analysis": {
    "overall_coverage": 85,
    "common_requirements": ["List of requirements shared by all controls"],
    "control_specific": [{"control_code": "NIST-AC-1", "unique_requirements": ["..."], "coverage_by_unified": 90}],
    "gaps": ["Requirements that are difficult to fully cover"]
  },
  "unified_control": {
    "title": "Clear, actionable control title",
    "description": "Concise description covering all source framework requirements",
    "implementation_guidance": "Comprehensive implementation guidance",
    "control_type": "Preventive|Detective|Corrective",
    "automation_level": "Manual|Semi-Automated|Automated",
    "frequency": "Continuous|Daily|Weekly|Monthly|Quarterly|Annual|Event-Driven",
    "security_function": "Govern|Identify|Protect|Detect|Respond|Recover",
    "subcontrols": [{"title": "...", "description": "...", "addresses_controls": ["..."]}],
    "framework_mappings": [{"control_code": "...", "coverage_type": "Full|Partial", "notes": "..."}]
  }
}`
      : `${contextPrefix}You are a security control implementation expert. Your role is to help organizations translate framework controls into practical, implementable internal controls.

Respond with valid JSON only, matching this structure:
{
  "title": "Clear, actionable control title",
  "description": "Concise description of what this control does and why it matters",
  "implementation_guidance": "Step-by-step implementation guidance",
  "control_type": "Preventive|Detective|Corrective",
  "automation_level": "Manual|Semi-Automated|Automated",
  "frequency": "Continuous|Daily|Weekly|Monthly|Quarterly|Annual|Event-Driven",
  "security_function": "Govern|Identify|Protect|Detect|Respond|Recover",
  "subcontrols": [{"title": "...", "description": "..."}]
}`;

    const userPrompt = isMultiControl
      ? `Analyze these ${controlsList.length} framework controls and generate a unified internal control that covers all of them:\n\n${controlsDescription}\n\n${customContext ? `**Organization Context:** ${customContext}` : ''}\n${existingControlsList}\n\nPlease:\n1. Analyze how much these controls overlap (coverage percentage)\n2. Identify common vs unique requirements\n3. Generate ONE unified internal control that addresses ALL framework requirements\n4. Note any gaps that are difficult to fully cover\n5. Include subcontrols for complex aspects, noting which source controls they address`
      : `Generate an internal control implementation based on this framework control:\n${controlsDescription}\n\n${customContext ? `**Organization Context:** ${customContext}` : ''}\n${existingControlsList}\n\nGenerate a practical, implementable internal control that addresses this framework requirement. Include 2-4 subcontrols if the control is complex enough to warrant decomposition.`;

    const result = await chatCompletion({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }, pool);

    // Parse JSON from response
    let suggestion;
    try {
      const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, result];
      const jsonStr = jsonMatch[1]?.trim() || result.trim();
      suggestion = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("[control-forge-suggest] Failed to parse AI response:", result);
      throw new Error("Failed to parse AI suggestion");
    }

    return { suggestion, isMultiControl };
  } catch (error) {
    console.error("[control-forge-suggest] Error:", error);
    throw error;
  }
}
