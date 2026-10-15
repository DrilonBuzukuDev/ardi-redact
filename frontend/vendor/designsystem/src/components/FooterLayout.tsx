import type { MouseEventHandler } from "react";
import classes from "./FooterLayout.module.css";

export type FooterItem = {
  label: string;
} & (
  | { href: string; onClick?: never; id?: never }
  | { href?: never; onClick?: MouseEventHandler<HTMLButtonElement>; id?: string }
);

export type FooterColumn = {
  title: string;
  items: FooterItem[];
};

export type FooterLayoutProps = {
  brand: {
    name: string;
    href: string;
    logoSrc: string;
    copyright: string;
  };
  columns: FooterColumn[];
  maxItemsPerColumn?: 1 | 2 | 3;
  currentPath?: string;
  className?: string;
};

export function FooterLayout({ brand, columns, maxItemsPerColumn = 3, currentPath, className }: FooterLayoutProps) {
  const items = columns.flatMap((column) => column.items);
  const groups = Array.from({ length: Math.ceil(items.length / maxItemsPerColumn) }, (_, index) =>
    items.slice(index * maxItemsPerColumn, (index + 1) * maxItemsPerColumn),
  );

  return (
    <div className={[classes.layout, className].filter(Boolean).join(" ")}>
      <div className={classes.brand}>
        <a href={brand.href} aria-label={`${brand.name} home`}>
          <img src={brand.logoSrc} alt={brand.name} width="84" height="28" />
        </a>
        <span className={classes.copyright}>{brand.copyright}</span>
      </div>
      <nav className={classes.columns} aria-label="Footer links">
      {groups.map((group) => (
        <div key={group[0].label} className={classes.column}>
          {group.map((item) => item.href !== undefined ? (
            <a key={item.label} href={item.href} aria-current={currentPath === item.href ? "page" : undefined}>
              {item.label}
            </a>
          ) : (
            <button key={item.label} type="button" id={item.id} onClick={item.onClick}>
              {item.label}
            </button>
          ))}
        </div>
      ))}
      </nav>
    </div>
  );
}
