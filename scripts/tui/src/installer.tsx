#!/usr/bin/env bun
/**
 * @file installer.tsx
 * @description Entry point for Jira MCP TUI Installer
 * Uses OpenTUI framework for React-based terminal UI
 */

import { createCliRenderer } from '@opentui/core';
import { createRoot } from '@opentui/react';
import { App } from './App.tsx';

/** Initialize and render the TUI application */
async function main() {
    try {
        const renderer = await createCliRenderer();
        const root = createRoot(renderer);
        root.render(<App />);
    } catch (error) {
        console.error('Failed to start installer:', (error as Error).message);
        process.exit(1);
    }
}

main();
