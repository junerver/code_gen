# PRD Workflow Tools

<div align="center">
  <img src="https://img.shields.io/badge/PRD-Workflow-blue?style=for-the-badge&logo=github" alt="PRD Workflow" width="200"/>
  <h3>AI-Powered Product Development</h3>
</div>

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

A collection of reusable AI prompts to streamline your product development workflow. These prompts can be copied and pasted into any AI assistant (like Cursor) to automate common tasks in your product development process.

> [!TIP]
> **Why PRD & RFC Driven Development?** This approach significantly improves AI collaboration by providing clear boundaries, reducing hallucinations, and ensuring consistent understanding between humans and AI. [Jump to full benefits](#benefits-of-prd--rfc-driven-development)

## Table of Contents
- [Benefits of PRD & RFC Driven Development](#benefits-of-prd--rfc-driven-development)
- [Available Prompts](#available-prompts)
- [Recommended Workflow](#recommended-workflow)
- [How to Use](#how-to-use)
- [Quick Tips](#quick-tips)
- [License](#license)

## Benefits of PRD & RFC Driven Development

Following a structured PRD & RFC driven development approach offers significant advantages, especially when collaborating with AI tools:

<div align="center">
  <table>
    <tr>
      <td align="center">🤖</td>
      <td align="center">⚙️</td>
      <td align="center">💼</td>
      <td align="center">🧠</td>
    </tr>
    <tr>
      <td align="center"><b>Enhanced AI<br>Collaboration</b></td>
      <td align="center"><b>Improved<br>Development</b></td>
      <td align="center"><b>Business<br>Benefits</b></td>
      <td align="center"><b>AI-Specific<br>Advantages</b></td>
    </tr>
  </table>
</div>

### Enhanced AI Collaboration
- **Clearer Instructions**: Well-defined PRDs and RFCs provide AI with precise context and requirements, resulting in more accurate implementations
- **Reduced Hallucinations**: Structured documentation minimizes AI's tendency to "fill in the gaps" with incorrect assumptions
- **Consistent Mental Model**: Both humans and AI work from the same documented understanding, reducing misalignment

### Improved Development Process
- **Boundary Setting**: Clearly defined scope prevents AI from implementing unwanted or out-of-scope features
- **Incremental Verification**: Breaking work into RFCs allows for validation at each step rather than only at project completion
- **Traceability**: Each implementation can be traced back to specific requirements, making it easier to verify correctness
- **Reduced Rework**: Clear specifications from the start minimize the need for major revisions later

### Business Benefits
- **Predictable Outcomes**: Structured approach leads to more predictable development timelines and results
- **Knowledge Preservation**: Documentation serves as a persistent reference even as team members or AI tools change
- **Stakeholder Alignment**: PRDs create a shared understanding between business, technical teams, and AI assistants
- **Faster Onboarding**: New team members or AI tools can quickly understand project goals and constraints

### AI-Specific Advantages
- **Context Window Optimization**: Breaking large projects into focused RFCs helps AI work within context window limitations
- **Targeted Expertise**: Different aspects of the project can be directed to specialized AI models or prompts
- **Iterative Refinement**: AI can suggest improvements to PRDs and RFCs before implementation begins
- **Quality Control**: Structured documentation provides clear criteria for AI to self-evaluate its outputs

By following this methodology, you'll experience more productive AI collaboration, higher quality implementations, and a smoother overall development process.

## Available Prompts

- [**Interactive PRD Creation**](interactive-prd-creation-prompt.md) - Create a PRD through a guided step-by-step questioning process
- [**PRD Comprehensive Verification**](prd-comprehensive-verification-prompt.md) - Verify and improve your PRD by identifying critical gaps and quality issues
- [**PRD to Features Extraction**](prd-to-features-prompt.md) - Extract and organize features from your PRD
- [**PRD to Rules**](prd-to-rules-prompt.md) - Generate technical guidelines and standards for development
- [**PRD to RFCs**](prd-to-rfcs-prompt.md) - Break down your PRD into manageable implementation units
- [**Implementation Template**](implementation-prompt-template.md) - Template for implementing individual RFCs
- [**PRD Change Management**](prd-change-management-prompt.md) - Manage changes to your PRD during development

## Recommended Workflow

<div align="center">
  <pre>
  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
  │    Create   │     │   Verify    │     │   Extract   │     │    Create   │     │   Generate  │     │  Implement  │
  │     PRD     │────▶│     PRD     │────▶│   Features  │────▶│    Rules    │────▶│    RFCs     │────▶│    RFCs     │
  └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
  </pre>
</div>

### Initial Development
1. **Create PRD** - Start with a vague idea and develop it into a complete PRD using the Interactive Creation prompt
2. **Verify PRD** - Identify critical gaps and improve quality using the Comprehensive Verification prompt
3. **Extract Features** - Transform your verified PRD into organized features with priorities and acceptance criteria
4. **Create Rules** - Establish technical guidelines and standards based on your PRD and features
5. **Generate RFCs** - Break down the project into logical, manageable implementation units
6. **Implement RFCs** - Use the implementation template for each RFC to guide development

### Managing Changes
When new requirements or changes arise during development:
1. **Analyze Changes** - Use the Change Management prompt to assess impact and integration strategy
2. **Update Documents** - Revise affected PRD, features, rules, and RFCs based on the analysis
3. **Continue Implementation** - Resume development with the updated documentation

## How to Use

### Method 1: Manual Copy
1. Open the desired prompt file
2. Copy the entire contents
3. Paste into your AI assistant (Cursor, ChatGPT, Claude, etc.)
4. Attach your PRD or relevant documents
5. Let the AI process your request

### Method 2: Using the Copy Script
For convenience, you can use the included script to copy a prompt to your clipboard:

```bash
# Make the script executable (first time only)
chmod +x copy-prompt.sh

# Copy a prompt to clipboard
./copy-prompt.sh interactive-prd-creation-prompt.md

# See available prompts
./copy-prompt.sh
```

Then paste the prompt into your AI assistant and proceed as normal.

## Quick Tips

- Provide complete documents when possible
- Answer any clarifying questions the AI asks
- Review and customize AI outputs before implementation
- Use the prompts in sequence for best results
- For complex projects, iterate through prompts as needed

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">Made with ❤️ for better product development with AI</p> 