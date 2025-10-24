/**
 * Plugin Config Form
 * Dynamic form based on plugin's configSchema
 */

import { useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useUpdatePluginConfig } from '@/queries/plugins';
import type { Plugin } from '@/types/plugin';

interface PluginConfigFormProps {
  plugin: Plugin;
}

export function PluginConfigForm({ plugin }: PluginConfigFormProps) {
  const updateConfigMutation = useUpdatePluginConfig();
  const [config, setConfig] = useState<Record<string, any>>(plugin.config || {});

  const schema = plugin.metadata.configSchema;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfigMutation.mutate({ id: plugin.id, config });
  };

  const handleChange = (key: string, value: any) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  if (!schema || !schema.properties) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>This plugin has no configuration options</p>
      </div>
    );
  }

  const properties = schema.properties;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {Object.entries(properties).map(([key, prop]: [string, any]) => {
        const value = config[key] ?? prop.default;

        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={key}>
              {prop.title || key}
              {schema.required?.includes(key) && <span className="text-red-500 ml-1">*</span>}
            </Label>

            {/* Boolean/Switch */}
            {prop.type === 'boolean' && (
              <div className="flex items-center space-x-2">
                <Switch
                  id={key}
                  checked={value}
                  onCheckedChange={(checked) => handleChange(key, checked)}
                />
                {prop.description && (
                  <span className="text-sm text-muted-foreground">{prop.description}</span>
                )}
              </div>
            )}

            {/* Number */}
            {prop.type === 'number' && (
              <>
                <Input
                  id={key}
                  type="number"
                  value={value || ''}
                  onChange={(e) => handleChange(key, parseFloat(e.target.value))}
                  min={prop.minimum}
                  max={prop.maximum}
                  placeholder={prop.default?.toString()}
                />
                {prop.description && (
                  <p className="text-sm text-muted-foreground">{prop.description}</p>
                )}
              </>
            )}

            {/* String (textarea for long text) */}
            {prop.type === 'string' && prop.maxLength && prop.maxLength > 100 && (
              <>
                <Textarea
                  id={key}
                  value={value || ''}
                  onChange={(e) => handleChange(key, e.target.value)}
                  placeholder={prop.default}
                  rows={4}
                />
                {prop.description && (
                  <p className="text-sm text-muted-foreground">{prop.description}</p>
                )}
              </>
            )}

            {/* String (input for short text) */}
            {prop.type === 'string' && (!prop.maxLength || prop.maxLength <= 100) && (
              <>
                <Input
                  id={key}
                  type="text"
                  value={value || ''}
                  onChange={(e) => handleChange(key, e.target.value)}
                  placeholder={prop.default}
                  minLength={prop.minLength}
                  maxLength={prop.maxLength}
                />
                {prop.description && (
                  <p className="text-sm text-muted-foreground">{prop.description}</p>
                )}
              </>
            )}

            {/* Array/Object - JSON input */}
            {(prop.type === 'array' || prop.type === 'object') && (
              <>
                <Textarea
                  id={key}
                  value={typeof value === 'object' ? JSON.stringify(value, null, 2) : value}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      handleChange(key, parsed);
                    } catch {
                      // Invalid JSON, keep as string
                    }
                  }}
                  placeholder={JSON.stringify(prop.default, null, 2)}
                  rows={6}
                  className="font-mono text-sm"
                />
                {prop.description && (
                  <p className="text-sm text-muted-foreground">{prop.description}</p>
                )}
              </>
            )}
          </div>
        );
      })}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setConfig(plugin.config || {})}
          disabled={updateConfigMutation.isPending}
        >
          Reset
        </Button>
        <Button type="submit" disabled={updateConfigMutation.isPending}>
          {updateConfigMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          Save Configuration
        </Button>
      </div>
    </form>
  );
}
