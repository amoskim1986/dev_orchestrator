/**
 * Test script for Claude CLI service
 * Run with: npx ts-node electron/services/claude-cli/test-cli.ts
 *
 * Or just test directly in terminal:
 * echo 'JSON only: { "status": "ok" }' | claude --print
 */

import { getClaudeCliService } from './claude-cli.service';
import { buildJourneyAnalysisPrompt, JOURNEY_ANALYSIS_SCHEMA } from './prompts';
import type { JourneyAnalysis } from './types';

async function testClaudeCli() {
  console.log('🧪 Testing Claude CLI Service...\n');

  const service = getClaudeCliService();

  // Test 1: Simple status check
  console.log('📊 Service Status:', service.getStatus());

  // Test 2: Simple JSON query
  console.log('\n🔄 Test 1: Simple JSON query...');
  const simpleResult = await service.queryJson<{ status: string; message: string }>(
    'Say hello to the dev orchestrator app',
    '{ status: "ok" | "error", message: string }'
  );
  console.log('Result:', simpleResult);

  // Test 3: Journey analysis
  console.log('\n🔄 Test 2: Journey analysis...');
  const prompt = buildJourneyAnalysisPrompt(
    'Add a dark mode toggle to the settings page with system preference detection',
    'React + Tailwind + Electron desktop app'
  );

  const analysisResult = await service.queryJson<JourneyAnalysis>(
    prompt,
    JOURNEY_ANALYSIS_SCHEMA
  );

  if (analysisResult.success && analysisResult.data) {
    console.log('\n✅ Journey Analysis:');
    console.log('  Title:', analysisResult.data.title);
    console.log('  Complexity:', analysisResult.data.complexity, '/ 5');
    console.log('  Branch:', analysisResult.data.suggestedBranchName);
    console.log('  Tasks:', analysisResult.data.keyTasks.length);
    console.log('  Duration:', analysisResult.durationMs, 'ms');
  } else {
    console.log('❌ Analysis failed:', analysisResult.error);
  }

  console.log('\n✨ Tests complete!');
}

// Run if executed directly
testClaudeCli().catch(console.error);
