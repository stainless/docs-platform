import { describe, expect, it } from 'vitest';
import { hasExpandableProperties } from '@stainless-api/docs-ui/utils';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ComponentProvider } from '@stainless-api/docs-ui/contexts/component';
import { DocsProvider } from '@stainless-api/docs-ui/contexts';
import { MethodInfo } from '@stainless-api/docs-ui/languages/http';

Object.assign(globalThis, { React });

const methodPath = '(resource) example > (method) create';

function renderMethodInfo(decl: Record<string, unknown>, declarations: Record<string, unknown>) {
  const spec = {
    decls: {
      http: {
        [methodPath]: decl,
        ...declarations,
      },
    },
    docs: { languages: ['http'] },
  };

  return renderToStaticMarkup(
    React.createElement(
      DocsProvider,
      { spec: spec as never, language: 'http', children: null },
      React.createElement(
        ComponentProvider,
        { children: null },
        React.createElement(MethodInfo, {
          decl: decl as never,
          children: React.createElement('span', null, 'method'),
        }),
      ),
    ),
  );
}

describe('hasExpandableProperties', () => {
  it('returns false when a group contains only simple declarations', () => {
    expect(hasExpandableProperties(['account_id'], { account_id: {} })).toBe(false);
  });

  it('returns false for a scalar body declaration', () => {
    expect(
      hasExpandableProperties(['body_name'], {
        body_name: { kind: 'HttpDeclProperty', key: 'name' },
      }),
    ).toBe(false);
  });

  it('recognizes description-only expanders when descriptions are collapsed', () => {
    expect(hasExpandableProperties(['account_id'], { account_id: { docstring: 'Account identifier' } })).toBe(
      true,
    );
    expect(
      hasExpandableProperties(
        ['account_id'],
        { account_id: { docstring: 'First line\n\nMore detail' } },
        'show-first-line',
      ),
    ).toBe(true);
  });

  it('does not recognize descriptions when description collapsing is disabled', () => {
    expect(
      hasExpandableProperties(['account_id'], { account_id: { docstring: 'Account identifier' } }, false),
    ).toBe(false);
  });

  it('ignores declarations whose children are suppressed by rendering rules', () => {
    expect(hasExpandableProperties(['result'], { result: { children: ['result'] } })).toBe(false);
    expect(
      hasExpandableProperties(['result'], {
        result: { children: ['balance'], childrenParentSchema: 'enum' },
      }),
    ).toBe(false);
    expect(
      hasExpandableProperties(
        ['result'],
        { result: { children: ['balance'], modelPath: 'model' } },
        true,
        false,
      ),
    ).toBe(false);
  });

  it('returns true when a group contains a declaration with children', () => {
    expect(hasExpandableProperties(['result'], { result: { children: ['balance'] } })).toBe(true);
  });

  it('resolves reference declarations before checking expandable content', () => {
    expect(
      hasExpandableProperties(['result'], {
        result: { kind: 'HttpDeclReference', type: { $ref: 'result_model' } },
        result_model: { children: ['balance'] },
      }),
    ).toBe(true);
  });

  it('does not infer expandable content from a cyclic reference chain', () => {
    expect(
      hasExpandableProperties(['first'], {
        first: { kind: 'HttpDeclReference', type: { $ref: 'second' } },
        second: { kind: 'HttpDeclReference', type: { $ref: 'first' }, children: ['balance'] },
      }),
    ).toBe(false);
  });

  it('keeps children on a self-referential declaration expandable', () => {
    expect(
      hasExpandableProperties(['self'], {
        self: { kind: 'HttpDeclReference', type: { $ref: 'self' }, children: ['balance'] },
      }),
    ).toBe(true);
  });

  it('omits the body toggle for a scalar body group', () => {
    const bodyPath = '(resource) example > (method) create > (body) application/json > (property) name';
    const markup = renderMethodInfo(
      {
        kind: 'HttpDeclFunction',
        stainlessPath: methodPath,
        paramsChildren: {},
        bodyParamsChildren: { 'application/json': [bodyPath] },
        responseChildren: [],
      },
      {
        [bodyPath]: {
          kind: 'HttpDeclProperty',
          stainlessPath: bodyPath,
          key: 'name',
          type: { kind: 'HttpTypeString' },
        },
      },
    );

    expect(markup).not.toContain('data-stldocs-property-toggle-target="body"');
  });

  it('keeps the toggle when a parameter reference resolves to expandable content', () => {
    const referencePath = '(resource) example > (method) create > (params) path > (property) result';
    const modelPath = `${referencePath}Model`;
    const childPath = `${modelPath} > (property) balance`;
    const markup = renderMethodInfo(
      {
        kind: 'HttpDeclFunction',
        stainlessPath: methodPath,
        paramsChildren: { path: [referencePath] },
        responseChildren: [],
      },
      {
        [referencePath]: {
          kind: 'HttpDeclReference',
          stainlessPath: referencePath,
          type: { $ref: modelPath },
        },
        [modelPath]: {
          kind: 'HttpDeclTypeAlias',
          stainlessPath: modelPath,
          ident: 'Result',
          type: { kind: 'HttpTypeObject', members: [] },
          children: [childPath],
        },
        [childPath]: {
          kind: 'HttpDeclProperty',
          stainlessPath: childPath,
          key: 'balance',
          type: { kind: 'HttpTypeNumber' },
        },
      },
    );

    expect(markup).toContain('data-stldocs-property-toggle-target="p"');
  });
});
