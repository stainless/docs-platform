import { HttpAST as AST } from '@stainless/sdk-json';
import {
  useAvailableLanguages,
  useDeclaration,
  useLanguage,
  useLanguageComponents,
  useNavigation,
  useSpec,
  useSettings,
} from '../contexts';
import { useComponents } from '../contexts/use-components';
import style from '../style';
import React from 'react';
import { PropertyFn } from '.';
import { PropertyToggle, useStreamingResponse } from '../components';
import { generateRoute, LanguageNames } from '../routing';
import clsx from 'clsx';
import { AssertExhaustive, getBodyParams, hasExpandableProperties, HttpBodyEncoding } from '../utils';
import { Badge } from '@stainless-api/ui-primitives';
import { BracesIcon, FormIcon } from 'lucide-react';

const ComplexTypes: Partial<Record<AST.HttpType['kind'], string>> = {
  HttpTypeUnion: 'union',
  HttpTypeIntersection: 'intersection',
};

const constStyle: Record<string, string> = {
  string: style.LiteralString,
  number: style.LiteralNumeric,
  boolean: style.LiteralBoolean,
};

type TypeProps = {
  type: AST.HttpType;
};

function Identifier({ name }: { name: string }) {
  return (
    <span className={style.TextIdentifier}>
      {/^[_a-zA-Z][_a-zA-Z0-9]*$/.test(name) ? name : JSON.stringify(name)}
    </span>
  );
}

function TypePreview({ path }: { path: string }) {
  const spec = useSpec();
  const language = useLanguage();
  const decl = useDeclaration(path, false);
  const { Join } = useComponents();

  if (
    !(decl && 'children' in decl && decl.children && decl.children.length > 0) ||
    ('type' in decl && decl['type'] && 'kind' in decl['type'] && decl['type']['kind'] === 'HttpTypeUnion')
  )
    return;

  const items = decl.children.map((prop, key) => {
    const decl = spec?.decls?.[language]?.[prop];
    const ident = decl && 'key' in decl ? decl.key : decl && 'ident' in decl ? decl.ident : null;

    return (
      <span key={key} className={style.TypePropertyName}>
        <span className={style.TextIdentifier}>{ident}</span>
      </span>
    );
  });

  return (
    <span className={style.TypePreview} data-stldocs-type-preview="properties">
      <span className={style.TypeBrace}>{' { '}</span>
      <span className={style.TypePreviewContent}>
        <Join items={items} limit={3}>
          <span className={style.TextOperator}>, </span>
        </Join>
      </span>
      <span className={style.TypeBrace}>{' } '}</span>
    </span>
  );
}

export function TypeName({ type }: TypeProps) {
  const Lang = useLanguageComponents();

  if (type.kind === 'HttpTypeArray') return <>array of {<Lang.TypeName type={type.elementType} />}</>;

  if (type.kind === 'HttpTypeUnion' && type.types.every((t) => t.kind === 'HttpTypeLiteral')) return 'enum';

  if (type.kind === 'HttpTypeReference' && type.ident.split('.').at(-1) === 'Record') return 'map';

  return ComplexTypes[type.kind] ?? <Lang.Type type={type} />;
}

export function Type({ type }: TypeProps) {
  const Lang = useLanguageComponents();
  const { Join, SDKReference } = useComponents();

  switch (type.kind) {
    case 'HttpTypeUnknown':
    case 'HttpTypeUndefined':
    case 'HttpTypeNull':
    case 'HttpTypeBoolean':
    case 'HttpTypeNumber':
    case 'HttpTypeString':
      return (
        <span className={style.Type}>
          <span className={style.TypePlain}>{type.kind.slice(8).toLowerCase()}</span>
        </span>
      );

    case 'HttpTypeBinary':
      return (
        <span className={style.Type}>
          <span className={style.TypePlain}>file</span>
        </span>
      );

    case 'HttpTypeLiteral':
      return (
        <span className={style.Type}>
          <span className={constStyle[typeof type.literal]}>{JSON.stringify(type.literal)}</span>
        </span>
      );

    case 'HttpTypeArray': {
      return (
        <span className={style.Type}>
          <span className={style.TypeArray}>{'array of '}</span>
          <Lang.Type type={type.elementType} />
        </span>
      );
    }

    case 'HttpTypeIntersection':
    case 'HttpTypeUnion': {
      const items = type.types.map((t, key) => <Lang.Type key={key} type={t} />);

      const delimiter = type.kind === 'HttpTypeUnion' ? 'or' : 'and';

      return (
        <span className={style.Type}>
          <span className={style.TypePreview} data-stldocs-type-preview="union">
            <span className={style.TypePreviewContent}>
              <Join items={items} limit={3}>
                <span className={style.TextOperator}> {delimiter} </span>
              </Join>
            </span>
          </span>
        </span>
      );
    }

    case 'HttpTypeReference': {
      const name = type.ident.split('.').at(-1);
      const params = type.typeParameters?.map((param, key) => <Lang.Type key={key} type={param} />);

      // TODO: come up with an unambiguous way to identify these on the sdkjson side
      // This is sketchy because it's possible for a user-defined type to be named "Record"
      if (
        name === 'Record' &&
        type.typeParameters?.length === 2 &&
        type.typeParameters?.at(0)!.kind === 'HttpTypeString'
      )
        return (
          <>
            <span className={style.TypeArray}>map</span>[{params?.[1]}]
          </>
        );

      return (
        <span className={style.Type}>
          <SDKReference stainlessPath={type.$ref!}>{name}</SDKReference>
          {params && params.length > 0 && (
            <>
              <span className={style.TypeBracket}>{'<'}</span>
              <Join items={params} limit={3}>
                <span className={style.TextOperator}>, </span>
              </Join>
              <span className={style.TypeBracket}>{'>'}</span>
            </>
          )}
          <TypePreview path={type.$ref!} />
        </span>
      );
    }

    case 'HttpTypeObject': {
      const items = type.members.map(({ ident }) => (
        <span className={style.TypePropertyName} key={ident}>
          <Identifier name={ident} />
        </span>
      ));

      return (
        <span className={style.Type}>
          <span className={style.TypePreviewPrefix}>object</span>
          <span className={style.TypePreview} data-stldocs-type-preview="properties">
            <span className={style.TypeBrace}>{' {'}</span>
            <span className={style.TypePreviewContent}>
              {' '}
              <Join items={items} limit={3}>
                <span className={style.TextOperator}>, </span>
              </Join>{' '}
            </span>
            <span className={style.TypeBrace}>{'} '}</span>
          </span>
        </span>
      );
    }

    default: {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      type _ = AssertExhaustive<typeof type>;

      return (
        <span className={style.Type}>
          <span className={style.TypePlain}>unknown</span>
        </span>
      );
    }
  }
}

export type MethodSignatureProps = {
  decl: AST.HttpDeclFunction;
};

export function MethodSignature({ decl }: MethodSignatureProps) {
  void decl;
  return null;
}

const EncodingBadges: Record<HttpBodyEncoding, React.ReactNode> = {
  unknown: null,
  json: (
    <Badge size="sm" icon={<BracesIcon />}>
      JSON
    </Badge>
  ),
  'form-data': (
    <Badge size="sm" icon={<FormIcon />}>
      Form Data
    </Badge>
  ),
};

export function MethodInfo({ decl, children }: MethodSignatureProps & { children: React.ReactNode }) {
  const Docs = useComponents();
  const streamingResponse = useStreamingResponse(decl);
  const implementedLanguages = useAvailableLanguages(decl.stainlessPath);
  const { basePath } = useNavigation();
  const spec = useSpec();
  const language = useLanguage();
  const declarations = spec?.decls?.[language];
  const collapseDescription = useSettings()?.properties?.collapseDescription ?? true;
  const includeModelProperties = useSettings()?.properties?.includeModelProperties ?? true;

  const params = Object.entries(decl.paramsChildren!)
    .filter(([, value]) => value.length)
    .map(([location, value]) => {
      const showToggle = hasExpandableProperties(
        value,
        declarations,
        collapseDescription,
        includeModelProperties,
      );

      return (
        <React.Fragment key={location}>
          <div className={style.MethodParameters} data-stldocs-property-group={location.at(0)}>
            <h5>
              {location.at(0)!.toUpperCase()}
              {location.slice(1)} Parameters
              {showToggle && <PropertyToggle target={location.at(0)!} />}
            </h5>
            <Docs.SDKChildren paths={value} />
          </div>
        </React.Fragment>
      );
    });

  const bodyParams = getBodyParams(decl);
  if (bodyParams && bodyParams.params.length > 0)
    params.push(
      <div className={style.MethodInfoSection} key="method-info-section">
        <h5>
          <span>Body Parameters{EncodingBadges[bodyParams.encoding]}</span>
          {hasExpandableProperties(
            bodyParams.params,
            declarations,
            collapseDescription,
            includeModelProperties,
          ) && <PropertyToggle target="body" />}
        </h5>
        <div className={style.MethodParameters} data-stldocs-property-group="body">
          <Docs.SDKChildren paths={bodyParams.params} />
        </div>
      </div>,
    );

  const responseChildren =
    'responseChildren' in decl && decl.responseChildren && decl.responseChildren.length > 0
      ? [...decl.responseChildren]
      : [];

  if (streamingResponse) responseChildren.push(streamingResponse);

  const showResponseToggle = hasExpandableProperties(
    responseChildren,
    declarations,
    collapseDescription,
    includeModelProperties,
  );

  if (params.length === 0 && responseChildren.length === 0) {
    const availableLanguageLinks = implementedLanguages
      .filter((lang) => lang !== 'http')
      .flatMap((lang) => {
        const url = generateRoute(basePath ?? '/', lang, decl.stainlessPath);
        return url ? [{ url, label: LanguageNames[lang] ?? lang }] : [];
      });
    return (
      <div className={style.MethodInfo}>
        {children}
        {availableLanguageLinks.length > 0 && (
          <div className={clsx('stl-ui-prose', style.MethodAvailableLanguages)}>
            <h5>Supported Languages</h5>
            <div className={style.MethodAvailableLanguages}>
              This method is available in:
              <ul>
                {availableLanguageLinks.map(({ url, label }) => {
                  return (
                    <li key={url}>
                      <a href={url}>{label}</a>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className={style.MethodInfo}>
      {children ? <div className={style.MethodContent}>{children}</div> : null}
      {params.length > 0 && params}
      {responseChildren.length > 0 && (
        <div className={style.MethodInfoSection}>
          <h5>
            Returns
            {showResponseToggle && <PropertyToggle target="returns" />}
          </h5>
          <div className={style.MethodReturns} data-stldocs-property-group="returns">
            <Docs.SDKChildren paths={responseChildren} />
          </div>
        </div>
      )}
    </div>
  );
}

function renderVariantInfo(type: AST.HttpType) {
  if (
    type.kind === 'HttpTypeUnion' &&
    type.types.every((t) => t.kind === 'HttpTypeObject' || t.kind === 'HttpTypeReference')
  )
    return <>One of the following {type.types.length} object variants:</>;
}

export type PropertyProps = {
  decl: AST.HttpDeclaration;
  children: PropertyFn;
};

export function Property({ decl, children }: PropertyProps) {
  const Lang = useLanguageComponents();

  if (!decl) return;

  switch (decl.kind) {
    case 'HttpDeclProperty': {
      const variants = renderVariantInfo(decl.type);

      return children({
        name: decl.key,
        typeName: <Lang.TypeName type={decl.type} />,
        type: decl.type.kind in ComplexTypes && !variants && <Lang.Type type={decl.type} />,
      });
    }

    case 'HttpDeclTypeAlias':
      return children({
        name: decl.ident,
        typeName: <Lang.TypeName type={decl.type} />,
      });

    case 'HttpDeclReference':
      return children({ type: <Lang.Type type={decl.type} /> });
  }
}

export type DeclarationProps = { decl: AST.HttpDeclaration };

export function Declaration({ decl }: DeclarationProps) {
  const Lang = useLanguageComponents();

  if (!decl) return;

  switch (decl.kind) {
    case 'HttpDeclProperty':
      return (
        <>
          <span className={style.TypePropertyName}>
            <Identifier name={decl.key} />
          </span>
          <span className={style.TextPunctuation}>: </span>
          {decl.optional && <span className={style.TextPunctuation}>optional </span>}
          <Lang.Type type={decl.type} />
        </>
      );

    case 'HttpDeclTypeAlias':
      return (
        <>
          {/^UnionMember/.test(decl.ident) ? null : (
            <>
              <Identifier name={decl.ident} />
              {decl.type.kind === 'HttpTypeObject' ? ' ' : <span className={style.TextOperator}> = </span>}
            </>
          )}
          <Lang.Type type={decl.type} />
        </>
      );

    case 'HttpDeclReference':
      return <Lang.Type type={decl.type} />;
  }
}
