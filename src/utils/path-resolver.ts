/**
 * @file path-resolver.ts
 * @description Shared utility for platform-specific path resolution
 * Handles environment variable expansion and home directory substitution
 */

import * as os from 'os';

/**
 * Map Node.js platform to config schema platform key
 * Remote config uses: macos, windows, linux (not darwin/win32)
 */
export function mapPlatform(platform: NodeJS.Platform): 'macos' | 'windows' | 'linux' {
    return platform === 'win32' ? 'windows' : platform === 'darwin' ? 'macos' : 'linux';
}

/**
 * Resolve platform-specific path with environment variable expansion
 * Handles: ~, $HOME, %APPDATA%, %USERPROFILE%
 */
export function resolvePlatformPath(pathStr: string): string {
    let resolved = pathStr;

    // Replace ~ with home directory
    resolved = resolved.replace(/^~/, os.homedir());

    // Replace $HOME (Unix) or %HOME% (Windows-like)
    resolved = resolved.replace(/\$HOME|%HOME%/gi, os.homedir());

    // Windows-specific environment variables
    if (process.platform === 'win32') {
        resolved = resolved.replace(/%APPDATA%/gi, process.env.APPDATA || '');
        resolved = resolved.replace(/%USERPROFILE%/gi, process.env.USERPROFILE || '');
        resolved = resolved.replace(/%LOCALAPPDATA%/gi, process.env.LOCALAPPDATA || '');
    }

    // Unix-specific environment variables
    if (process.platform !== 'win32') {
        // Expand other environment variables in Unix format
        resolved = resolved.replace(/\$([A-Z_]+)/gi, (_, name) => process.env[name] || '');
    }

    return resolved;
}
