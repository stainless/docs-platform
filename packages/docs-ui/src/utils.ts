import type * as SDKJSON from '@stainless/sdk-json';
import { parseStainlessPath } from './routing';

export function flatResources(
  resources: Record<string, SDKJSON.Resource> | undefined,
  parents: SDKJSON.Resource[],
): { resource: SDKJSON.Resource; parents: SDKJSON.Resource[] }[] {
  return Object.keys(resources ?? {}).flatMap((key: string | number) => {
    const resource = resources![key]!;
    return [
      { resource, parents },
      ...(resource.subresources ? flatResources(resource.subresources, [...parents, resource]) : []),
    ];
  });
}

export function getResourceFromSpec(
  stainlessPath: string | string[],
  spec: SDKJSON.Spec,
): SDKJSON.Resource | null {
  if (typeof stainlessPath === 'string') {
    const parsed = parseStainlessPath(stainlessPath);
    if (!parsed?.resource) return null;
    stainlessPath = parsed.resource;
  }

  return (
    stainlessPath
      .slice(1)
      .reduce((acc, cur) => acc?.subresources?.[cur], spec.resources[stainlessPath[0]!]) ?? null
  );
}

export function isResourceEmpty(resource: SDKJSON.Resource) {
  return !(
    Object.values(resource.methods).length > 0 ||
    Object.values(resource.models).length > 0 ||
    Object.values(resource.subresources!).length > 0
  );
}

export function hasExpandableProperties(
  paths: readonly string[],
  declarations: Record<string, unknown> | undefined,
  collapseDescription: boolean | 'show-first-line' = true,
  includeModelProperties: boolean | 'method-page' = true,
) {
  function hasExpandableProperty(path: string, seen: Set<string>): boolean {
    const declaration = declarations?.[path];
    if (!declaration || typeof declaration !== 'object') return false;

    const kind = 'kind' in declaration ? declaration.kind : undefined;
    const type = 'type' in declaration ? declaration.type : undefined;
    const referenceId =
      typeof kind === 'string' &&
      kind.endsWith('Reference') &&
      type &&
      typeof type === 'object' &&
      '$ref' in type
        ? type.$ref
        : undefined;

    if (
      typeof referenceId === 'string' &&
      referenceId !== path &&
      declarations?.[referenceId] &&
      !seen.has(referenceId)
    ) {
      return hasExpandableProperty(referenceId, new Set(seen).add(referenceId));
    }

    const children = 'children' in declaration ? declaration.children : undefined;
    const childrenParentSchema =
      'childrenParentSchema' in declaration ? declaration.childrenParentSchema : undefined;
    const isUnion =
      kind !== 'CLIFlag' &&
      kind !== 'CLISchemaProperty' &&
      (childrenParentSchema === 'enum' || childrenParentSchema === 'union');
    const inlineModelProperties =
      includeModelProperties === 'method-page' || includeModelProperties !== false;
    const hasChildren =
      Array.isArray(children) &&
      children.length > 0 &&
      !children.includes(path) &&
      !(isUnion && childrenParentSchema === 'enum' && children.length === 1) &&
      (inlineModelProperties || !('modelPath' in declaration));

    if (hasChildren) return true;
    if (collapseDescription === false || !('docstring' in declaration)) return false;

    const docstring = declaration.docstring;
    if (typeof docstring !== 'string' || !docstring) return false;
    if (collapseDescription === true) return true;

    return docstring.indexOf('\n\n') > 0;
  }

  return paths.some((path) => hasExpandableProperty(path, new Set()));
}

export type HttpBodyEncoding = 'json' | 'form-data' | 'unknown';

export function getBodyParams(
  decl: SDKJSON.HttpAST.HttpDeclFunction,
): { params: SDKJSON.ID[]; encoding: HttpBodyEncoding } | null {
  if (!decl.bodyParamsChildren) return null;

  const keys = Object.keys(decl.bodyParamsChildren);
  if (keys.length > 1) {
    console.warn('multiple bodyParams content types in ' + decl.stainlessPath + ':', keys);
  }

  const jsonKey = keys.find((e) => /[/+]json(;|$)/.test(e));
  if (jsonKey) {
    return {
      params: decl.bodyParamsChildren[jsonKey]!,
      encoding: 'json',
    };
  }

  const formDataKey = keys.find((e) => /^multipart\/form-data(;|$)/.test(e));
  if (formDataKey) {
    return {
      params: decl.bodyParamsChildren[formDataKey]!,
      encoding: 'form-data',
    };
  }

  const firstKey = keys[0];
  if (firstKey) {
    return {
      params: decl.bodyParamsChildren[firstKey]!,
      encoding: 'unknown',
    };
  }

  return null;
}

export type AssertExhaustive<T extends never> = T;
