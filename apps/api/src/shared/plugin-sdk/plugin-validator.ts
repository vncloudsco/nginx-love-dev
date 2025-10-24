/**
 * Plugin Validator
 * Validate plugin package trước khi install
 */

import { PluginMetadata, PluginValidationResult, PluginType } from './types';
import semver from 'semver';

export class PluginValidator {
  private systemVersion: string;

  constructor(systemVersion?: string) {
    this.systemVersion = systemVersion || process.env.APP_VERSION || '1.0.0';
  }

  /**
   * Validate plugin metadata
   */
  validateMetadata(metadata: PluginMetadata): PluginValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!metadata.id || typeof metadata.id !== 'string') {
      errors.push('Plugin ID is required and must be a string');
    } else if (!/^[a-z0-9-_]+$/.test(metadata.id)) {
      errors.push('Plugin ID must contain only lowercase letters, numbers, hyphens and underscores');
    }

    if (!metadata.name || typeof metadata.name !== 'string') {
      errors.push('Plugin name is required and must be a string');
    }

    if (!metadata.version || typeof metadata.version !== 'string') {
      errors.push('Plugin version is required and must be a string');
    } else if (!semver.valid(metadata.version)) {
      errors.push('Plugin version must be a valid semver (e.g., 1.0.0)');
    }

    if (!metadata.description || typeof metadata.description !== 'string') {
      errors.push('Plugin description is required and must be a string');
    }

    if (!metadata.author || typeof metadata.author !== 'object') {
      errors.push('Plugin author is required and must be an object');
    } else {
      if (!metadata.author.name || typeof metadata.author.name !== 'string') {
        errors.push('Plugin author name is required and must be a string');
      }
      if (metadata.author.email && !this.isValidEmail(metadata.author.email)) {
        errors.push('Plugin author email must be a valid email address');
      }
      if (metadata.author.url && !this.isValidUrl(metadata.author.url)) {
        errors.push('Plugin author URL must be a valid URL');
      }
    }

    if (!metadata.type || !Object.values(PluginType).includes(metadata.type)) {
      errors.push(`Plugin type must be one of: ${Object.values(PluginType).join(', ')}`);
    }

    if (!metadata.license || typeof metadata.license !== 'string') {
      errors.push('Plugin license is required and must be a string');
    }

    // Optional fields validation
    if (metadata.homepage && !this.isValidUrl(metadata.homepage)) {
      errors.push('Plugin homepage must be a valid URL');
    }

    if (metadata.repository && !this.isValidUrl(metadata.repository)) {
      warnings.push('Plugin repository should be a valid URL');
    }

    // Version compatibility
    if (metadata.minSystemVersion) {
      if (!semver.valid(metadata.minSystemVersion)) {
        errors.push('minSystemVersion must be a valid semver');
      } else if (semver.lt(this.systemVersion, metadata.minSystemVersion)) {
        errors.push(`Plugin requires system version >= ${metadata.minSystemVersion}, current: ${this.systemVersion}`);
      }
    }

    if (metadata.maxSystemVersion) {
      if (!semver.valid(metadata.maxSystemVersion)) {
        errors.push('maxSystemVersion must be a valid semver');
      } else if (semver.gt(this.systemVersion, metadata.maxSystemVersion)) {
        errors.push(`Plugin requires system version <= ${metadata.maxSystemVersion}, current: ${this.systemVersion}`);
      }
    }

    // Permissions validation
    if (metadata.permissions) {
      if (!Array.isArray(metadata.permissions)) {
        errors.push('Plugin permissions must be an array');
      } else {
        metadata.permissions.forEach((perm, index) => {
          if (!perm.resource || typeof perm.resource !== 'string') {
            errors.push(`Permission[${index}].resource is required and must be a string`);
          }
          if (!perm.actions || !Array.isArray(perm.actions)) {
            errors.push(`Permission[${index}].actions is required and must be an array`);
          } else if (perm.actions.length === 0) {
            errors.push(`Permission[${index}].actions must not be empty`);
          }
        });
      }
    }

    // Dependencies validation
    if (metadata.dependencies) {
      Object.entries(metadata.dependencies).forEach(([pkg, version]) => {
        if (!semver.validRange(version)) {
          warnings.push(`Dependency ${pkg} has invalid version range: ${version}`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Validate plugin package structure
   */
  validatePackageStructure(files: string[]): PluginValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Must have plugin.config.json
    if (!files.includes('plugin.config.json')) {
      errors.push('Plugin package must contain plugin.config.json');
    }

    // Must have main entry file
    const hasIndexJs = files.some(f => f === 'index.js' || f === 'dist/index.js');
    if (!hasIndexJs) {
      errors.push('Plugin package must contain index.js or dist/index.js');
    }

    // Check for common security issues
    const suspiciousFiles = files.filter(f => 
      f.includes('..') || 
      f.startsWith('/') || 
      f.includes('node_modules') ||
      f.match(/\.(sh|bat|cmd|exe|dll)$/i)
    );

    if (suspiciousFiles.length > 0) {
      errors.push(`Plugin package contains suspicious files: ${suspiciousFiles.join(', ')}`);
    }

    // Warnings
    if (!files.includes('README.md')) {
      warnings.push('Plugin should include README.md');
    }

    if (!files.includes('LICENSE')) {
      warnings.push('Plugin should include LICENSE file');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Validate plugin dependencies
   */
  async validateDependencies(metadata: PluginMetadata): Promise<PluginValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!metadata.dependencies) {
      return { valid: true };
    }

    // Check for known vulnerable packages
    const vulnerablePackages = [
      'event-stream@3.3.6',
      'eslint-scope@3.7.2',
    ];

    Object.entries(metadata.dependencies).forEach(([pkg, version]) => {
      const fullName = `${pkg}@${version}`;
      if (vulnerablePackages.includes(fullName)) {
        errors.push(`Plugin uses vulnerable package: ${fullName}`);
      }
    });

    // Warn about large dependencies
    const largeDependencies = ['electron', 'webpack', 'typescript'];
    largeDependencies.forEach(pkg => {
      if (metadata.dependencies && metadata.dependencies[pkg]) {
        warnings.push(`Plugin includes large dependency: ${pkg}. Consider making it a peerDependency.`);
      }
    });

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Comprehensive validation
   */
  async validate(metadata: PluginMetadata, files?: string[]): Promise<PluginValidationResult> {
    const results: PluginValidationResult[] = [];

    // Validate metadata
    results.push(this.validateMetadata(metadata));

    // Validate package structure if files provided
    if (files) {
      results.push(this.validatePackageStructure(files));
    }

    // Validate dependencies
    results.push(await this.validateDependencies(metadata));

    // Merge results
    const allErrors = results.flatMap(r => r.errors || []);
    const allWarnings = results.flatMap(r => r.warnings || []);

    return {
      valid: allErrors.length === 0,
      errors: allErrors.length > 0 ? allErrors : undefined,
      warnings: allWarnings.length > 0 ? allWarnings : undefined
    };
  }

  /**
   * Helper methods
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}
