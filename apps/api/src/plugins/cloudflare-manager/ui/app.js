/**
 * Cloudflare Manager Plugin UI
 * Vue.js Application
 */

const { createApp } = Vue;

// Get plugin API base URL from window or default
const API_BASE = window.PLUGIN_API_BASE || '/api/plugins/cloudflare-manager';

createApp({
  data() {
    return {
      activeTab: 'zones',
      loading: false,
      syncing: false,
      
      // Data
      zones: [],
      selectedZone: null,
      dnsRecords: [],
      firewallRules: [],
      stats: null,
      
      // Forms
      showDNSForm: false,
      showFirewallForm: false,
      showQuickBlock: false,
      editingDNS: null,
      editingFirewall: null,
      
      dnsForm: {
        type: 'A',
        name: '',
        content: '',
        ttl: 3600,
        proxied: false,
      },
      
      firewallForm: {
        mode: 'block',
        configuration: {
          target: 'ip',
          value: '',
        },
        notes: '',
      },
      
      quickBlockForm: {
        ip: '',
        notes: '',
      },
    };
  },
  
  mounted() {
    this.loadStats();
    this.loadZones();
  },
  
  watch: {
    activeTab(newTab) {
      if (newTab === 'dns' && this.selectedZone) {
        this.loadDNSRecords();
      } else if (newTab === 'firewall') {
        this.loadFirewallRules();
      }
    },
  },
  
  methods: {
    // ==================== API Calls ====================
    
    async apiCall(method, endpoint, data = null) {
      try {
        const config = {
          method,
          url: `${API_BASE}${endpoint}`,
          headers: {
            'Content-Type': 'application/json',
          },
        };
        
        if (data) {
          if (method === 'GET') {
            config.params = data;
          } else {
            config.data = data;
          }
        }
        
        const response = await axios(config);
        return response.data;
      } catch (error) {
        console.error('API Error:', error);
        alert(error.response?.data?.error || error.message || 'API request failed');
        throw error;
      }
    },
    
    // ==================== Stats ====================
    
    async loadStats() {
      try {
        const result = await this.apiCall('GET', '/stats');
        this.stats = result.data;
      } catch (error) {
        console.error('Failed to load stats:', error);
      }
    },
    
    async syncData() {
      this.syncing = true;
      try {
        await this.apiCall('POST', '/sync');
        await this.loadStats();
        alert('Sync completed successfully');
      } catch (error) {
        // Error already handled
      } finally {
        this.syncing = false;
      }
    },
    
    // ==================== Zones ====================
    
    async loadZones() {
      this.loading = true;
      try {
        const result = await this.apiCall('GET', '/zones');
        this.zones = result.data;
      } catch (error) {
        this.zones = [];
      } finally {
        this.loading = false;
      }
    },
    
    selectZone(zone) {
      this.selectedZone = zone;
      this.activeTab = 'dns';
      this.loadDNSRecords();
    },
    
    // ==================== DNS Records ====================
    
    async loadDNSRecords() {
      if (!this.selectedZone) return;
      
      this.loading = true;
      try {
        const result = await this.apiCall('GET', `/zones/${this.selectedZone.id}/dns`);
        this.dnsRecords = result.data;
      } catch (error) {
        this.dnsRecords = [];
      } finally {
        this.loading = false;
      }
    },
    
    editDNS(record) {
      this.editingDNS = record;
      this.dnsForm = {
        type: record.type,
        name: record.name,
        content: record.content,
        ttl: record.ttl,
        proxied: record.proxied,
      };
      this.showDNSForm = true;
    },
    
    async saveDNS() {
      if (!this.selectedZone) return;
      
      try {
        if (this.editingDNS) {
          // Update existing record
          await this.apiCall('PUT', `/zones/${this.selectedZone.id}/dns/${this.editingDNS.id}`, this.dnsForm);
          alert('DNS record updated successfully');
        } else {
          // Create new record
          await this.apiCall('POST', `/zones/${this.selectedZone.id}/dns`, this.dnsForm);
          alert('DNS record created successfully');
        }
        
        this.closeDNSForm();
        await this.loadDNSRecords();
        await this.loadStats();
      } catch (error) {
        // Error already handled
      }
    },
    
    async deleteDNS(record) {
      if (!confirm(`Delete DNS record "${record.name}"?`)) return;
      
      try {
        await this.apiCall('DELETE', `/zones/${this.selectedZone.id}/dns/${record.id}`);
        alert('DNS record deleted successfully');
        await this.loadDNSRecords();
      } catch (error) {
        // Error already handled
      }
    },
    
    closeDNSForm() {
      this.showDNSForm = false;
      this.editingDNS = null;
      this.dnsForm = {
        type: 'A',
        name: '',
        content: '',
        ttl: 3600,
        proxied: false,
      };
    },
    
    // ==================== Firewall Rules ====================
    
    async loadFirewallRules() {
      this.loading = true;
      try {
        const params = this.selectedZone ? { zoneId: this.selectedZone.id } : {};
        const result = await this.apiCall('GET', '/firewall/rules', params);
        this.firewallRules = result.data;
      } catch (error) {
        this.firewallRules = [];
      } finally {
        this.loading = false;
      }
    },
    
    editFirewall(rule) {
      this.editingFirewall = rule;
      this.firewallForm = {
        mode: rule.mode,
        configuration: {
          target: rule.configuration.target,
          value: rule.configuration.value,
        },
        notes: rule.notes || '',
      };
      this.showFirewallForm = true;
    },
    
    async saveFirewall() {
      try {
        const params = this.selectedZone ? { zoneId: this.selectedZone.id } : {};
        
        if (this.editingFirewall) {
          // Update existing rule (only mode and notes can be updated)
          await this.apiCall('PUT', `/firewall/rules/${this.editingFirewall.id}`, this.firewallForm, params);
          alert('Firewall rule updated successfully');
        } else {
          // Create new rule
          await this.apiCall('POST', '/firewall/rules', this.firewallForm, params);
          alert('Firewall rule created successfully');
        }
        
        this.closeFirewallForm();
        await this.loadFirewallRules();
        await this.loadStats();
      } catch (error) {
        // Error already handled
      }
    },
    
    async deleteFirewall(rule) {
      if (!confirm(`Delete firewall rule for "${rule.configuration.value}"?`)) return;
      
      try {
        const params = this.selectedZone ? { zoneId: this.selectedZone.id } : {};
        await this.apiCall('DELETE', `/firewall/rules/${rule.id}`, params);
        alert('Firewall rule deleted successfully');
        await this.loadFirewallRules();
      } catch (error) {
        // Error already handled
      }
    },
    
    async quickBlockIP() {
      try {
        const data = {
          ip: this.quickBlockForm.ip,
          notes: this.quickBlockForm.notes || `Blocked by Cloudflare Manager - ${new Date().toLocaleString()}`,
          zoneId: this.selectedZone?.id,
        };
        
        await this.apiCall('POST', '/firewall/block-ip', data);
        alert(`IP ${this.quickBlockForm.ip} blocked successfully`);
        
        this.showQuickBlock = false;
        this.quickBlockForm = { ip: '', notes: '' };
        
        await this.loadFirewallRules();
        await this.loadStats();
      } catch (error) {
        // Error already handled
      }
    },
    
    closeFirewallForm() {
      this.showFirewallForm = false;
      this.editingFirewall = null;
      this.firewallForm = {
        mode: 'block',
        configuration: {
          target: 'ip',
          value: '',
        },
        notes: '',
      };
    },
    
    // ==================== Helpers ====================
    
    getModeClass(mode) {
      const classes = {
        block: 'bg-red-100 text-red-800',
        challenge: 'bg-yellow-100 text-yellow-800',
        whitelist: 'bg-green-100 text-green-800',
        js_challenge: 'bg-orange-100 text-orange-800',
      };
      return classes[mode] || 'bg-gray-100 text-gray-800';
    },
  },
}).mount('#app');
