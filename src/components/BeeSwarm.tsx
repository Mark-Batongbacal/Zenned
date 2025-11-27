"use client";

import React from "react";

type BeeConfig = {
    id: number;
    delay: number;
    duration: number;
    size: number;
    altitude: number;
    wave: number;
    reverse?: boolean;
};

const beeConfigs: BeeConfig[] = [
    { id: 0, delay: 0, duration: 20, size: 18, altitude: 15, wave: 18 },
    { id: 1, delay: 2.5, duration: 24, size: 20, altitude: 35, wave: 26, reverse: true },
    { id: 2, delay: 1.2, duration: 22, size: 16, altitude: 55, wave: 14 },
    { id: 3, delay: 3.8, duration: 28, size: 22, altitude: 25, wave: 30, reverse: true },
    { id: 4, delay: 0.8, duration: 18, size: 15, altitude: 70, wave: 16 },
    { id: 5, delay: 4.5, duration: 26, size: 19, altitude: 45, wave: 22, reverse: true },
    { id: 6, delay: 1.6, duration: 21, size: 17, altitude: 82, wave: 20 },
];

type BeeStyle = React.CSSProperties & {
    "--bee-wave"?: string;
    "--bee-size"?: string;
};

export default function BeeSwarm() {
    return (
        <div className="bee-swarm" aria-hidden="true">
            {beeConfigs.map(bee => {
                const style: BeeStyle = {
                    top: `${bee.altitude}%`,
                    animationDelay: `${bee.delay}s`,
                    animationDuration: `${bee.duration}s`,
                    "--bee-wave": `${bee.wave}px`,
                    "--bee-size": `${bee.size}px`,
                };
                return (
                    <div key={bee.id} className={`bee ${bee.reverse ? "bee--reverse" : ""}`} style={style}>
                        <div className="bee-body">
                            <span className="wing wing-left" />
                            <span className="wing wing-right" />
                            <span className="bee-stripes" />
                            <span className="bee-stinger" />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
