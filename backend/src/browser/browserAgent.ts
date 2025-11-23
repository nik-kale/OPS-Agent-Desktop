import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { missionService } from '../missions/missionService';
import { MissionStepType } from '../types/mission';

/**
 * BrowserAgent orchestrates browser automation for ops missions.
 *
 * Uses Playwright to:
 * - Navigate to ops dashboards (Grafana, Kibana, custom UIs)
 * - Capture screenshots at each step
 * - Execute read-only observations (OBSERVATION steps)
 * - Execute approved interventions (ACTION steps via Secure-MCP-Gateway)
 *
 * For MVP: demonstrates with a local mock-app dashboard.
 */
export class BrowserAgent {
  private browser: Browser | null = null;
  private screenshotsDir: string;

  constructor() {
    this.screenshotsDir = path.join(__dirname, '../../screenshots');
    this.ensureScreenshotsDir();
  }

  private ensureScreenshotsDir(): void {
    if (!fs.existsSync(this.screenshotsDir)) {
      fs.mkdirSync(this.screenshotsDir, { recursive: true });
    }
  }

  /**
   * Initialize browser instance.
   */
  async init(): Promise<void> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true, // Set to false for debugging
      });
    }
  }

  /**
   * Close browser instance.
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Execute a mission by automating browser interactions.
   *
   * For MVP, demonstrates a simple flow:
   * 1. Open ops dashboard
   * 2. Navigate to logs page
   * 3. Simulate a "restart service" action
   * 4. Call stub RCA and remediation functions
   */
  async executeMission(missionId: string, prompt: string): Promise<void> {
    await this.init();

    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.browser.newPage();

    try {
      missionService.updateStatus(missionId, 'RUNNING');

      // Step 1: Navigate to ops dashboard
      await this.navigateToDashboard(page, missionId);

      // Step 2: Analyze dashboard for errors
      await this.analyzeDashboard(page, missionId);

      // Step 3: Navigate to logs
      await this.navigateToLogs(page, missionId);

      // Step 4: Call AutoRCA-Core (stubbed)
      await this.performRCA(missionId, prompt);

      // Step 5: Propose remediation via Secure-MCP-Gateway (stubbed)
      await this.proposeRemediation(missionId);

      // Step 6: Simulate executing approved action
      await this.executeApprovedAction(page, missionId);

      missionService.updateStatus(missionId, 'COMPLETED');

      missionService.addStep(
        missionId,
        MissionStepType.OBSERVATION,
        '✅ Mission completed successfully'
      );
    } catch (error) {
      missionService.updateStatus(missionId, 'FAILED');
      missionService.addStep(
        missionId,
        MissionStepType.OBSERVATION,
        `❌ Mission failed: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      await page.close();
    }
  }

  private async navigateToDashboard(page: Page, missionId: string): Promise<void> {
    missionService.addStep(
      missionId,
      MissionStepType.OBSERVATION,
      'Opening Ops Dashboard...'
    );

    // TODO: Replace with actual dashboard URL (Grafana, Datadog, etc.)
    // For MVP, using local mock-app
    await page.goto('http://localhost:5174');
    await page.waitForLoadState('networkidle');

    const screenshotPath = await this.captureScreenshot(page, missionId, 'dashboard');

    missionService.addStep(
      missionId,
      MissionStepType.OBSERVATION,
      'Dashboard loaded - analyzing current status',
      screenshotPath
    );
  }

  private async analyzeDashboard(page: Page, missionId: string): Promise<void> {
    missionService.addStep(
      missionId,
      MissionStepType.OBSERVATION,
      'Analyzing dashboard metrics and alerts...'
    );

    // In a real implementation, this would:
    // - Parse metrics from the dashboard
    // - Identify anomalies
    // - Extract error messages
    await page.waitForTimeout(1000); // Simulate analysis time

    missionService.addStep(
      missionId,
      MissionStepType.OBSERVATION,
      'Detected: 500 errors on checkout service (15 errors/min)'
    );
  }

  private async navigateToLogs(page: Page, missionId: string): Promise<void> {
    missionService.addStep(
      missionId,
      MissionStepType.OBSERVATION,
      'Navigating to logs page...'
    );

    // Click on "Logs" link in mock app
    const logsLink = page.locator('text=Logs');
    if (await logsLink.count() > 0) {
      await logsLink.click();
      await page.waitForLoadState('networkidle');
    }

    const screenshotPath = await this.captureScreenshot(page, missionId, 'logs');

    missionService.addStep(
      missionId,
      MissionStepType.OBSERVATION,
      'Logs page loaded - reviewing error traces',
      screenshotPath
    );
  }

  /**
   * Call AutoRCA-Core for root cause analysis.
   * TODO: Replace with actual HTTP call to AutoRCA-Core service.
   */
  private async performRCA(missionId: string, prompt: string): Promise<void> {
    missionService.addStep(
      missionId,
      MissionStepType.RCA,
      'Invoking AutoRCA-Core for graph-based root cause analysis...'
    );

    // Simulate RCA processing time
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // TODO: Actual integration
    // const rcaResult = await fetch('http://autorka-core:8000/analyze', {
    //   method: 'POST',
    //   body: JSON.stringify({ logs, metrics, traces, timeWindow }),
    // });

    const mockRCASummary = `
**Root Cause Analysis Summary**

**Primary Cause**: Database connection pool exhaustion on checkout-db-primary
**Confidence**: 87%

**Causal Chain**:
1. Deployment of checkout-service v2.3.1 at 14:23 UTC
2. New code path introduced N+1 query pattern
3. Connection pool saturated within 5 minutes
4. Subsequent requests timing out after 30s
5. Circuit breaker opened, returning 500 errors

**Supporting Evidence**:
- Correlation: 0.94 between deployment timestamp and error spike
- DB connection metrics: 100/100 connections in use
- Slow query log: 450% increase in SELECT queries to orders table
    `.trim();

    missionService.setRCASummary(missionId, mockRCASummary);

    missionService.addStep(
      missionId,
      MissionStepType.RCA,
      'RCA complete - root cause identified: connection pool exhaustion'
    );
  }

  /**
   * Propose remediation via Secure-MCP-Gateway.
   * TODO: Replace with actual call to gateway service.
   */
  private async proposeRemediation(missionId: string): Promise<void> {
    missionService.addStep(
      missionId,
      MissionStepType.REMEDIATION,
      'Consulting Secure-MCP-Gateway for approved remediation actions...'
    );

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // TODO: Actual integration
    // const remediation = await fetch('http://secure-mcp-gateway:8080/propose', {
    //   method: 'POST',
    //   body: JSON.stringify({ rcaSummary, context }),
    // });

    const mockRemediation = `
**Proposed Remediation**

**Immediate Actions** (Auto-approved - Read-only):
1. ✓ Scale checkout-service replicas from 3 → 8
2. ✓ Increase DB connection pool max from 100 → 200

**Intervention Actions** (Require Approval):
1. ⏳ Rollback checkout-service to v2.3.0
2. ⏳ Restart checkout-db-primary to clear connections

**Status**: Awaiting approval for intervention actions via Secure-MCP-Gateway
    `.trim();

    missionService.setRemediationProposal(missionId, mockRemediation);

    missionService.addStep(
      missionId,
      MissionStepType.REMEDIATION,
      'Remediation plan generated - awaiting gateway approval for write actions'
    );
  }

  /**
   * Execute an approved action (for demo, simulates clicking a button).
   * In production, this would go through Secure-MCP-Gateway with policy checks.
   */
  private async executeApprovedAction(page: Page, missionId: string): Promise<void> {
    // For demo purposes, simulate approval
    missionService.addStep(
      missionId,
      MissionStepType.ACTION,
      'Gateway approval received (simulated) - executing restart action...'
    );

    // Navigate back to dashboard if needed
    await page.goto('http://localhost:5174');
    await page.waitForLoadState('networkidle');

    // Look for "Restart Service" button
    const restartButton = page.locator('button:has-text("Restart Service")');
    if (await restartButton.count() > 0) {
      await restartButton.click();
      await page.waitForTimeout(500);

      const screenshotPath = await this.captureScreenshot(page, missionId, 'action-complete');

      missionService.addStep(
        missionId,
        MissionStepType.ACTION,
        'Service restart initiated successfully',
        screenshotPath
      );
    } else {
      missionService.addStep(
        missionId,
        MissionStepType.ACTION,
        'Action completed (UI interaction simulated)'
      );
    }
  }

  /**
   * Capture and save a screenshot.
   */
  private async captureScreenshot(
    page: Page,
    missionId: string,
    label: string
  ): Promise<string> {
    const timestamp = Date.now();
    const filename = `${missionId}_${label}_${timestamp}.png`;
    const filepath = path.join(this.screenshotsDir, filename);

    await page.screenshot({ path: filepath, fullPage: true });

    return filename; // Return relative path for serving via static files
  }
}

// Singleton instance
export const browserAgent = new BrowserAgent();
