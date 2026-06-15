import { type ReactNode } from 'react';
import { useIgnoredResources, useLanguage, useSettings } from '../contexts';
import { useComponents } from '../contexts/use-components';
import style from '../style';
import { ArrowDownWideNarrowIcon, ArrowUpNarrowWideIcon, LinkIcon } from 'lucide-react';
import { Button } from '@stainless-api/ui-primitives';

export type PropertyToggleProps = {
  target: string;
};

export function PropertyToggle({ target }: PropertyToggleProps) {
  return (
    <span
      className={style.ExpandToggle}
      data-stldocs-property-toggle-expanded="false"
      data-stldocs-property-toggle-target={target}
    >
      <span className={style.ExpandToggleContent}>
        Expand <ArrowDownWideNarrowIcon className={style.Icon} size={16} />
      </span>
      <span className={style.ExpandToggleContent}>
        Collapse <ArrowUpNarrowWideIcon className={style.Icon} size={16} />
      </span>
    </span>
  );
}

export type PropertyDescriptionProps = {
  description?: string;
};

export function PropertyDescription({ description }: PropertyDescriptionProps) {
  const { Markdown } = useComponents();

  if (description)
    return (
      <div className={style.PropertyDescription}>
        <Markdown content={description} />
      </div>
    );
}

export type PropertyTitleProps = {
  title?: string;
};

export function PropertyTitle({ title }: PropertyTitleProps) {
  const { Markdown } = useComponents();

  if (title)
    return (
      <div className={style.PropertyTitle}>
        <Markdown content={title} />
      </div>
    );
}

function splitDescription(description?: string) {
  const pos = description?.indexOf('\n\n');
  if (!description || !pos || pos < 0) return [description, null];
  return [description.slice(0, pos), description.slice(pos)];
}

export type PropertyProps = {
  id?: string;
  name?: ReactNode;
  typeName?: ReactNode;
  badges?: ReactNode;
  type?: ReactNode;
  description?: string;
  title?: string;
  expand?: boolean;
  deprecated?: boolean | string;
  additional?: ReactNode;
  declaration?: ReactNode;
  constraints?: ReactNode;
  children?: ReactNode;
};

export function Property({
  id,
  name,
  typeName,
  badges,
  type,
  declaration,
  description,
  title,
  deprecated,
  expand,
  additional,
  constraints,
  children,
}: PropertyProps) {
  const Docs = useComponents();
  const language = useLanguage();

  const { collapseDescription, showTitle, types } = useSettings()?.properties ?? {};

  const ignoredResources = useIgnoredResources();

  if (ignoredResources.includes(id || '')) {
    return null;
  }

  const [descFirstLine, descRest] =
    collapseDescription === 'show-first-line' ? splitDescription(description) : [null, description];

  const textContent = (
    <>
      {typeof deprecated === 'string' && (
        <div className={style.PropertyDeprecatedMessage}>
          <Docs.Markdown content={deprecated} />
        </div>
      )}
      {descRest && <Docs.PropertyDescription description={descRest} />}
      {constraints ? <div className={style.PropertyContent}>{constraints}</div> : null}
    </>
  );

  const rich = (
    <>
      <div className={style.PropertyDeclaration}>
        {deprecated && <span className={style.PropertyDeprecated}>Deprecated</span>}
        {declaration}
        {badges ? <span className={style.PropertyBadges}>{badges}</span> : null}
      </div>
      {title && showTitle && <Docs.PropertyTitle title={title} />}
      {collapseDescription === false
        ? textContent
        : descFirstLine && <Docs.PropertyDescription description={descFirstLine} />}
    </>
  );

  const simple = (
    <>
      {name ? (
        <div className={style.PropertyHeader}>
          {deprecated && <span className={style.PropertyDeprecated}>Deprecated</span>}
          <span className={style.PropertyName}>{name}</span>
          {typeName ? <span className={style.PropertyTypeName}>{typeName}</span> : null}
          {badges ? <span className={style.PropertyBadges}>{badges}</span> : null}
        </div>
      ) : null}
      {type ? <div className={style.PropertyType}>{type}</div> : null}
      {title && showTitle && <Docs.PropertyTitle title={title} />}
      {collapseDescription === false ? textContent : null}
    </>
  );

  const content = (
    <div id={id} className={style.PropertyInfo}>
      {types === 'simple' ? simple : rich}
    </div>
  );

  return (
    <div className={style.Property} data-stldocs-language={language}>
      {children || (collapseDescription !== false && descRest) ? (
        <Docs.Expander summary={content} muted={!children} open={expand}>
          {collapseDescription !== false ? textContent : null}
          {additional}
          {children ? <div className={style.PropertyChildren}>{children}</div> : null}
        </Docs.Expander>
      ) : (
        content
      )}
      {id && (
        <Button
          className={style.DeepLinkButton}
          variant="outline"
          size="sm"
          href={`#${encodeURIComponent(id)}`}
          aria-label="Link to this property"
        >
          <Button.Icon icon={LinkIcon} />
        </Button>
      )}
    </div>
  );
}
