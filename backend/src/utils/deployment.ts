export function isServerDeployment(): boolean {
    return process.env.DEPLOYMENT_MODE === 'server';
}

export function isDesktopDeployment(): boolean {
    return !isServerDeployment();
}
