"use strict";
/**
 * Plugin System Types & Interfaces
 * Định nghĩa các types và interfaces chuẩn cho hệ thống plugin
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginStatus = exports.PluginType = void 0;
/**
 * Plugin Type - Các loại plugin được hỗ trợ
 */
var PluginType;
(function (PluginType) {
    PluginType["FEATURE"] = "feature";
    PluginType["INTEGRATION"] = "integration";
    PluginType["UI"] = "ui";
    PluginType["MIDDLEWARE"] = "middleware";
    PluginType["HOOK"] = "hook"; // Plugin hook vào lifecycle
})(PluginType || (exports.PluginType = PluginType = {}));
/**
 * Plugin Status - Trạng thái của plugin
 */
var PluginStatus;
(function (PluginStatus) {
    PluginStatus["ACTIVE"] = "active";
    PluginStatus["INACTIVE"] = "inactive";
    PluginStatus["ERROR"] = "error";
    PluginStatus["INSTALLING"] = "installing";
    PluginStatus["UNINSTALLING"] = "uninstalling";
})(PluginStatus || (exports.PluginStatus = PluginStatus = {}));
