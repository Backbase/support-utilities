function convertToSwiftConfig(input) {
    const configJson = JSON.parse(input);    

    const backbase = configJson.backbase || {};
    const identity = backbase.identity || {};
    const oAuth2 = backbase.oAuth2 || {};
    const security = configJson.security || {};
    const custom = configJson.custom || {};
    const headers = configJson.persistentHeaders || {};

    const escapeString = (str) => str.replace(/"/g, '\\"');

    let swift = `let configuration = BBConfiguration()\n\n`;

    // Create identity configuration if all required fields are present
    if (identity.baseURL && identity.realm && identity.clientId) {
        const applicationKeyParam = identity.applicationKey ? `,\n    applicationKey: "${escapeString(identity.applicationKey)}"` : '';
        swift += `let identityConfig = BBIdentityConfiguration(\n    baseURL: "${escapeString(identity.baseURL)}",\n    realm: "${escapeString(identity.realm)}",\n    clientId: "${escapeString(identity.clientId)}"${applicationKeyParam}\n)\n`;
    }

    // Create OAuth2 configuration if required fields are present
    if (oAuth2.tokenEndpoint || oAuth2.clientId) {
        const tokenEndpointParam = oAuth2.tokenEndpoint ? `\n    tokenEndpoint: "${escapeString(oAuth2.tokenEndpoint)}"` : '';
        const clientIdParam = oAuth2.clientId ? `\n    clientId: "${escapeString(oAuth2.clientId)}"` : '';
        const params = [tokenEndpointParam, clientIdParam].filter(p => p).join(',');
        swift += `let oAuth2Config = BBOAuth2Configuration(${params}\n)\n`;
    }

    // Create backbase configuration
    const serverURLParam = backbase.serverURL ? `\n    serverURL: "${escapeString(backbase.serverURL)}"` : '';
    const versionParam = backbase.version ? `\n    version: "${escapeString(backbase.version)}"` : '';
    const identityParam = (identity.baseURL && identity.realm && identity.clientId) ? `\n    identity: identityConfig` : '';
    const oAuth2Param = (oAuth2.tokenEndpoint || oAuth2.clientId) ? `\n    oAuth2: oAuth2Config` : '';
    
    const backbaseParams = [serverURLParam, versionParam, identityParam, oAuth2Param].filter(p => p).join(',');
    if (backbaseParams) {
        swift += `configuration.backbase = BBBackbaseConfiguration(${backbaseParams}\n)\n`;
    }

    // Set security configuration if allowed domains are present
    if (Array.isArray(security.allowedDomains) && security.allowedDomains.length > 0) {
        const domains = security.allowedDomains.map(d => `"${escapeString(d)}"`).join(", ");
        swift += `configuration.security = BBSecurityConfiguration(\n    allowedDomains: [${domains}]\n)\n`;
    }

    // Set persistent headers if present
    if (Object.keys(headers).length > 0) {
        swift += `configuration.persistentHeaders = [\n`;
        for (const [key, values] of Object.entries(headers)) {
            const arr = values.map(v => `"${escapeString(v)}"`).join(", ");
            swift += `    "${escapeString(key)}": [${arr}],\n`;
        }
        swift += `]\n`;
    }

    // Set bank timezone if present
    if (configJson.bankTimeZone) {
        swift += `configuration.bankTimeZone = "${escapeString(configJson.bankTimeZone)}"\n`;
    }

    // Set app group identifier if present
    if (configJson.appGroupIdentifier) {
        swift += `configuration.appGroupIdentifier = "${escapeString(configJson.appGroupIdentifier)}"\n`;
    }

    // Set custom properties if present
    if (Object.keys(custom).length > 0) {
        swift += `configuration.custom = [\n`;
        for (const [key, value] of Object.entries(custom)) {
            if (typeof value === "string") {
                swift += `    "${escapeString(key)}": "${escapeString(value)}",\n`;
            } else if (typeof value === "number") {
                swift += `    "${escapeString(key)}": ${value},\n`;
            } else if (typeof value === "boolean") {
                swift += `    "${escapeString(key)}": ${value},\n`;
            } else if (Array.isArray(value)) {
                const arr = value.map(v => `"${escapeString(v)}"`).join(", ");
                swift += `    "${escapeString(key)}": [${arr}],\n`;
            } else if (typeof value === "object") {
                const entries = Object.entries(value)
                    .map(([k, v]) => `"${escapeString(k)}": "${escapeString(v)}"`)
                    .join(", ");
                swift += `    "${escapeString(key)}": [${entries}],\n`;
            }
        }
        swift += `]\n`;
    }

    return swift;
}
