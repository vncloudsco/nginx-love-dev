"use strict";
/**
 * Plugin SDK - Main Export
 * Export tất cả interfaces, types và classes cho plugin system
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginManager = exports.PluginLoader = exports.PluginValidator = exports.PluginAPIImpl = exports.PluginEventEmitterImpl = exports.PluginStorageImpl = exports.createPluginContext = exports.BasePlugin = void 0;
// Types & Interfaces
__exportStar(require("./types"), exports);
// Base Plugin Class
var base_plugin_1 = require("./base-plugin");
Object.defineProperty(exports, "BasePlugin", { enumerable: true, get: function () { return base_plugin_1.BasePlugin; } });
// Plugin Context
var plugin_context_1 = require("./plugin-context");
Object.defineProperty(exports, "createPluginContext", { enumerable: true, get: function () { return plugin_context_1.createPluginContext; } });
Object.defineProperty(exports, "PluginStorageImpl", { enumerable: true, get: function () { return plugin_context_1.PluginStorageImpl; } });
Object.defineProperty(exports, "PluginEventEmitterImpl", { enumerable: true, get: function () { return plugin_context_1.PluginEventEmitterImpl; } });
Object.defineProperty(exports, "PluginAPIImpl", { enumerable: true, get: function () { return plugin_context_1.PluginAPIImpl; } });
// Plugin Validator
var plugin_validator_1 = require("./plugin-validator");
Object.defineProperty(exports, "PluginValidator", { enumerable: true, get: function () { return plugin_validator_1.PluginValidator; } });
// Plugin Loader
var plugin_loader_1 = require("./plugin-loader");
Object.defineProperty(exports, "PluginLoader", { enumerable: true, get: function () { return plugin_loader_1.PluginLoader; } });
// Plugin Manager
var plugin_manager_1 = require("./plugin-manager");
Object.defineProperty(exports, "PluginManager", { enumerable: true, get: function () { return plugin_manager_1.PluginManager; } });
