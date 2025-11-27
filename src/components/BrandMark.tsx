import React from "react";
import Image from "next/image";

type BrandMarkProps = {
    variant?: "default" | "inline";
    className?: string;
    textClassName?: string;
    priority?: boolean;
    iconSize?: number;
};

const BrandMark: React.FC<BrandMarkProps> = ({
    variant = "default",
    className = "",
    textClassName = "",
    priority = false,
    iconSize,
}) => {
    const baseClass = variant === "inline" ? "brand-mark brand-mark-inline" : "brand-mark";
    const rootClass = `${baseClass}${className ? ` ${className}` : ""}`;
    const labelClass = `brand-mark__text${textClassName ? ` ${textClassName}` : ""}`;
    const resolvedIconSize = iconSize ?? (variant === "inline" ? 28 : 64);

    return (
        <span className={rootClass}>
            <span className="brand-mark__icon">
                <Image
                    src="/logo.png"
                    alt="Zenned logo"
                    width={resolvedIconSize}
                    height={resolvedIconSize}
                    priority={priority}
                />
            </span>
            <span className={labelClass}>Zenned</span>
        </span>
    );
};

export default BrandMark;
