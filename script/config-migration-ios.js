function convertToSwiftConfig(input) {
    const configJson = JSON.parse(input);    

    const backbase = configJson.backbase || {};
    const identity = backbase.identity || {};
    const oAuth2 = backbase.oAuth2 || {};
    const security = configJson.security || {};
    const custom = configJson.custom || {};
    const headers = configJson.persistentHeaders || {};

    const escapeString = (str) => str.replace(/"/g, '\\"');

    let swift = `let builder = BBConfigurationBuilder()\n`;
    swift += `let config = builder\n`;

    if (backbase.serverURL) {
        swift += `    .addServerURL("${escapeString(backbase.serverURL)}")\n`;
    }

    if (backbase.version) {
        swift += `    .addBBVersion("${escapeString(backbase.version)}")\n`;
    }

    if (backbase.sessionCookieName) {
        swift += `    .addSessionCookieName("${escapeString(backbase.sessionCookieName)}")\n`;
    }

    if (identity.baseURL && identity.realm && identity.clientId && identity.applicationKey) {
        swift += `    .addIdentityConfigurationWithBaseURL(\n`;
        swift += `        baseUrl = "${escapeString(identity.baseURL)}",\n`;
        swift += `        realm = "${escapeString(identity.realm)}",\n`;
        swift += `        clientId = "${escapeString(identity.clientId)}",\n`;
        swift += `        applicationKey = "${escapeString(identity.applicationKey)}"\n`;
        swift += `    )\n`;
    }

    if (oAuth2.tokenEndpoint && oAuth2.clientId) {
        swift += `    .addOAuth2ConfigurationWithTokenEndpoint(\n`;
        swift += `        tokenEndpoint = "${escapeString(oAuth2.tokenEndpoint)}",\n`;
        swift += `        clientId = "${escapeString(oAuth2.clientId)}"\n`;
        swift += `    )\n`;
    }

    if (Array.isArray(security.allowedDomains) && security.allowedDomains.length > 0) {
        const domains = security.allowedDomains.map(d => `"${escapeString(d)}"`).join(", ");
        swift += `    .addAllowedDomains([${domains}])\n`;
    }

    if (Object.keys(headers).length > 0) {
        swift += `    .addPersistentHeaders([\n`;
        for (const [key, values] of Object.entries(headers)) {
            const arr = values.map(v => `"${escapeString(v)}"`).join(", ");
            swift += `        "${escapeString(key)}": [${arr}],\n`;
        }
        swift += `    ])\n`;
    }

    if (configJson.bankTimeZone) {
        swift += `    .addBankTimeZone("${escapeString(configJson.bankTimeZone)}")\n`;
    }

    if (configJson.appGroupIdentifier) {
        swift += `    .addAppGroupIdentifier("${escapeString(configJson.appGroupIdentifier)}")\n`;
    }

    swift += `    .build()\n\n`;

    // Convert custom properties to Swift variables
    for (const [key, value] of Object.entries(custom)) {
        let safeKey = key.replace(/-/g, "_");

        if (Array.isArray(value)) {
            const arr = value.map(v => `"${escapeString(v)}"`).join(", ");
            swift += `let ${safeKey}: [String] = [${arr}]\n`;
        } else if (typeof value === "string") {
            swift += `let ${safeKey}: String = "${escapeString(value)}"\n`;
        } else if (typeof value === "number") {
            swift += `let ${safeKey}: Int = ${value}\n`;
        } else if (typeof value === "boolean") {
            swift += `let ${safeKey}: Bool = ${value}\n`;
        } else if (typeof value === "object") {
            // Assume string-to-string map
            const entries = Object.entries(value)
                .map(([k, v]) => `"${escapeString(k)}": "${escapeString(v)}"`)
                .join(", ");
            swift += `let ${safeKey}: [String: String] = [${entries}]\n`;
        }
    }

    return swift;
}
