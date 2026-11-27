import * as React from "react";
import { Link } from "react-router-dom";
import { Button, buttonVariants } from "./button";
import type { VariantProps } from "class-variance-authority";
import { cn } from "./utils";

interface LinkButtonProps
  extends React.ComponentProps<typeof Link>,
    VariantProps<typeof buttonVariants> {
  children: React.ReactNode;
}

export const LinkButton = React.forwardRef<HTMLAnchorElement, LinkButtonProps>(
  ({ className, variant, size, to, children, ...props }, ref) => {
    return (
      <Link
        ref={ref}
        to={to}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {children}
      </Link>
    );
  }
);

LinkButton.displayName = "LinkButton";
