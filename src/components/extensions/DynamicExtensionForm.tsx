import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CountryPackExtensionRead } from "@/types/country-pack";

interface JsonSchemaProp {
  type?: string;
  title?: string;
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

interface JsonSchemaObject {
  type?: string;
  properties?: Record<string, JsonSchemaProp>;
  required?: string[];
}

function asObjectSchema(v: Record<string, unknown> | null): JsonSchemaObject | null {
  if (v === null) {
    return null;
  }
  if (v.type === "object" || typeof v.properties === "object") {
    return v as JsonSchemaObject;
  }
  return null;
}

function fieldLabel(
  key: string,
  prop: JsonSchemaProp | undefined,
  extName: string
): string {
  const t = prop?.title?.trim();
  if (t !== undefined && t !== "") {
    return `${extName}: ${t}`;
  }
  return `${extName}: ${key}`;
}

export interface DynamicExtensionFormProps {
  extensions: CountryPackExtensionRead[];
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  disabled?: boolean;
  errors?: Record<string, string>;
}

export function DynamicExtensionForm({
  extensions,
  value,
  onChange,
  disabled = false,
  errors = {},
}: DynamicExtensionFormProps) {
  const { t } = useTranslation();

  if (extensions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("extensions.guest.noSchemas")}
      </p>
    );
  }

  function setField(key: string, nextVal: unknown): void {
    onChange({ ...value, [key]: nextVal });
  }

  return (
    <div className="space-y-6">
      {extensions.map((ext) => {
        const schema = asObjectSchema(ext.ui_config_schema);
        const propKeys = Object.keys(schema?.properties ?? {});
        const keys = Array.from(
          new Set<string>([...ext.required_fields, ...propKeys])
        );
        if (keys.length === 0) {
          return (
            <div
              key={ext.id}
              className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground"
            >
              {t("extensions.guest.emptyExtension", { name: ext.name })}
            </div>
          );
        }

        return (
          <div key={ext.id} className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {ext.name}
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              {keys.map((key) => {
                const prop = schema?.properties?.[key];
                const req =
                  ext.required_fields.includes(key) ||
                  (schema?.required?.includes(key) ?? false);
                const raw = value[key];
                const err = errors[key];
                const id = `ext-field-${ext.id}-${key}`;

                if (prop?.enum !== undefined && Array.isArray(prop.enum)) {
                  const strEnum = prop.enum.filter(
                    (x): x is string => typeof x === "string"
                  );
                  const sel =
                    typeof raw === "string"
                      ? raw
                      : raw === undefined || raw === null
                        ? ""
                        : String(raw);
                  return (
                    <div key={key} className="space-y-1.5 sm:col-span-2">
                      <label htmlFor={id} className="text-sm font-medium">
                        {fieldLabel(key, prop, ext.name)}
                        {req ? (
                          <span className="text-destructive"> *</span>
                        ) : null}
                      </label>
                      <Select
                        value={sel === "" ? undefined : sel}
                        disabled={disabled}
                        onValueChange={(v) => {
                          setField(key, v);
                        }}
                      >
                        <SelectTrigger id={id}>
                          <SelectValue
                            placeholder={t("extensions.guest.pickValue")}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {strEnum.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {err !== undefined ? (
                        <p className="text-xs text-destructive">
                          {t(err, { defaultValue: err })}
                        </p>
                      ) : null}
                    </div>
                  );
                }

                if (prop?.type === "boolean" || prop?.type === "checkbox") {
                  const checked = raw === true;
                  return (
                    <div
                      key={key}
                      className="flex items-center gap-2 sm:col-span-2"
                    >
                      <input
                        id={id}
                        type="checkbox"
                        disabled={disabled}
                        checked={checked}
                        className="h-4 w-4 rounded border border-input"
                        onChange={(e) => {
                          setField(key, e.target.checked);
                        }}
                      />
                      <label htmlFor={id} className="text-sm font-medium">
                        {fieldLabel(key, prop, ext.name)}
                        {req ? (
                          <span className="text-destructive"> *</span>
                        ) : null}
                      </label>
                      {err !== undefined ? (
                        <p className="text-xs text-destructive">
                          {t(err, { defaultValue: err })}
                        </p>
                      ) : null}
                    </div>
                  );
                }

                if (
                  prop?.type === "number" ||
                  prop?.type === "integer"
                ) {
                  const numStr =
                    raw === undefined || raw === null
                      ? ""
                      : typeof raw === "number"
                        ? String(raw)
                        : String(raw);
                  return (
                    <div key={key} className="space-y-1.5">
                      <label htmlFor={id} className="text-sm font-medium">
                        {fieldLabel(key, prop, ext.name)}
                        {req ? (
                          <span className="text-destructive"> *</span>
                        ) : null}
                      </label>
                      <Input
                        id={id}
                        type="number"
                        disabled={disabled}
                        value={numStr}
                        min={prop.minimum}
                        max={prop.maximum}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === "") {
                            setField(key, null);
                            return;
                          }
                          const n = Number(v);
                          setField(
                            key,
                            Number.isFinite(n) ? n : e.target.value
                          );
                        }}
                      />
                      {err !== undefined ? (
                        <p className="text-xs text-destructive">
                          {t(err, { defaultValue: err })}
                        </p>
                      ) : null}
                    </div>
                  );
                }

                const str =
                  raw === undefined || raw === null
                    ? ""
                    : typeof raw === "string"
                      ? raw
                      : JSON.stringify(raw);
                return (
                  <div
                    key={key}
                    className="space-y-1.5 sm:col-span-2 max-sm:col-span-2"
                  >
                    <label htmlFor={id} className="text-sm font-medium">
                      {fieldLabel(key, prop, ext.name)}
                      {req ? (
                        <span className="text-destructive"> *</span>
                      ) : null}
                    </label>
                    <Input
                      id={id}
                      disabled={disabled}
                      value={str}
                      maxLength={prop?.maxLength}
                      onChange={(e) => {
                        setField(key, e.target.value);
                      }}
                    />
                    {err !== undefined ? (
                      <p className="text-xs text-destructive">
                        {t(err, { defaultValue: err })}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Validate required fields and pattern/minLength from JSON Schema hints. */
export function validateExtensionFormData(
  extensions: CountryPackExtensionRead[],
  data: Record<string, unknown>
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const ext of extensions) {
    const schema = asObjectSchema(ext.ui_config_schema);
    for (const key of ext.required_fields) {
      const v = data[key];
      if (v === undefined || v === null || v === "") {
        errors[key] = "extensions.validation.required";
      }
    }
    const props = schema?.properties;
    if (props === undefined) {
      continue;
    }
    for (const [key, prop] of Object.entries(props)) {
      const v = data[key];
      if (v === undefined || v === null || v === "") {
        continue;
      }
      if (typeof v === "string") {
        if (
          prop.minLength !== undefined &&
          v.length < prop.minLength
        ) {
          errors[key] = "extensions.validation.minLength";
        }
        if (prop.pattern !== undefined && prop.pattern !== "") {
          try {
            const re = new RegExp(prop.pattern);
            if (!re.test(v)) {
              errors[key] = "extensions.validation.pattern";
            }
          } catch {
            /* ignore invalid pattern from schema */
          }
        }
      }
    }
  }

  return errors;
}
