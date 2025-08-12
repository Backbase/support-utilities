function developmentBlock(development) {
    if (!development) return "";

    const lines = [];
    
    if (typeof development.debugEnable === "boolean") {
        lines.push(`debugEnable = ${development.debugEnable}`);
    }
    
    if (typeof development.allowUntrustedCertificates === "boolean") {
        lines.push(`allowUntrustedCertificates = ${development.allowUntrustedCertificates}`);
    }
    
    if (lines.length === 0) return "";
    
    return `development = DevelopmentConfiguration {
        ${lines.join(",\n        ")}
    }`;
}

function identityBlock(identity) {
    if (!identity) return "";

    // Required constructor parameters
    const constructorParams = [];
    if (identity.baseURL) constructorParams.push(`baseUrl = "${identity.baseURL}"`);
    if (identity.realm) constructorParams.push(`realm = "${identity.realm}"`);
    if (identity.clientId) constructorParams.push(`clientId = "${identity.clientId}"`);

    if (constructorParams.length === 0) return "";

    // Optional DSL parameters
    const dslParams = [];
    if (identity.applicationKey) dslParams.push(`applicationKey = "${identity.applicationKey}"`);

    if (dslParams.length > 0) {
        return `identityConfiguration = IdentityConfiguration(
        ${constructorParams.join(",\n        ")}
    ) {
        ${dslParams.join("\n        ")}
    }`;
    } else {
        return `identityConfiguration = IdentityConfiguration(
        ${constructorParams.join(",\n        ")}
    )`;
    }
}

function oAuth2Block(oauth) {
    if (!oauth) return "";

    // Required constructor parameters
    const constructorParams = [];
    if (oauth.tokenEndpoint) constructorParams.push(`tokenEndpoint = "${oauth.tokenEndpoint}"`);
    if (oauth.clientId) constructorParams.push(`clientId = "${oauth.clientId}"`);

    if (constructorParams.length === 0) return "";

    return `oAuth2Configuration = OAuth2Configuration(
        ${constructorParams.join(",\n        ")}
    )`;
}

function allowedDomainsBlock(domains) {
    if (!domains || !domains.length) return "";
    const items = domains.map(d => `"${d}"`).join(",\n        ");
    return `allowedDomains = listOf(
        ${items}
    )`;
}

function allowedResourceServersBlock(domains) {
    if (!domains || !domains.length) return "";
    const items = domains.map(d => `"${d}"`).join(",\n        ");
    return `allowedResourceServers = listOf(
        ${items}
    )`;
}

function allowedAppSignaturesBlock(allowedAppSignatures) {
    if (!allowedAppSignatures || !allowedAppSignatures.length) return "";
    const items = allowedAppSignatures.map(d => `"${d}"`).join(",\n        ");
    return `allowedAppSignatures = listOf(
        ${items}
    )`;
}

function persistentHeadersBlock(headers) {
    if (!headers || Object.keys(headers).length === 0) return "";
    const pairs = Object.entries(headers).map(([k, v]) =>
        `"${k}" to listOf(${v.map(i => `"${i}"`).join(", ")})`
    ).join(",\n        ");
    return `persistentHeaders = mapOf(
        ${pairs}
    )`;
}

function customMapBlock(custom) {
    if (!custom || Object.keys(custom).length === 0) return "";

    const entries = Object.entries(custom).map(([key, value]) => {
        if (Array.isArray(value)) {
            return `"${key}" to listOf(${value.map(v => `"${v}"`).join(", ")})`;
        } else if (typeof value === "object" && value !== null) {
            const mapEntries = Object.entries(value).map(
                ([k, v]) => `"${k}" to ${typeof v === "number" || typeof v === "boolean" ? v : `"${v}"`}`
            ).join(", ");
            return `"${key}" to mapOf(${mapEntries})`;
        } else if (typeof value === "number" || typeof value === "boolean") {
            return `"${key}" to ${value}`;
        } else if (typeof value === "string") {
            return `"${key}" to "${value}"`;
        } else {
            return ""; // skip unsupported types
        }
    }).filter(Boolean);

    if (entries.length === 0) return "";

    return `custom = mapOf(
        ${entries.join(",\n        ")}
    )`;
}

function customPropertiesBlock(custom) {
    if (!custom) return "";

    const lines = [];

    for (const [key, value] of Object.entries(custom)) {
        if (Array.isArray(value)) {
            lines.push(`val ${key} = listOf(${value.map(v => `"${v}"`).join(", ")})`);
        } else if (typeof value === "object" && value !== null) {
            // Treat as Map<String, String>
            const entries = Object.entries(value).map(([k, v]) => `"${k}" to "${v}"`).join(", ");
            lines.push(`val ${key.replace(/-/g, "_")} = mapOf(${entries})`);
        } else if (typeof value === "string") {
            lines.push(`val ${key} = "${value}"`);
        } else if (typeof value === "number") {
            lines.push(`val ${key} = ${value}`);
        } else if (typeof value === "boolean") {
            lines.push(`val ${key} = ${value}`);
        }
    }

    return lines.join("\n");
}

function convertToKotlinConfig(input) {
    const json = JSON.parse(input);    

    const {
        version,
        serverURL,
        sessionCookieName,
        csrfCookieName,
        csrfHeaderName,
        identity,
        oAuth2
    } = json.backbase || {};

    // Required constructor parameter for BBConfiguration
    const bbConstructorParam = serverURL ? `serverUrl = "${serverURL}"` : "";
    
    // Build DSL block content
    const dslLines = [
        developmentBlock(json.development),
        version ? `version = "${version}"` : "",
        sessionCookieName ? `sessionCookieName = "${sessionCookieName}"` : "",
        csrfCookieName ? `csrfCookieName = "${csrfCookieName}"` : "",
        csrfHeaderName ? `csrfHeaderName = "${csrfHeaderName}"` : "",
        identityBlock(identity),
        oAuth2Block(oAuth2),
        allowedDomainsBlock(json.security?.allowedDomains),
        allowedResourceServersBlock(json.security?.allowedResourceServers),
        allowedAppSignaturesBlock(json.security?.allowedAppSignatures),
        persistentHeadersBlock(json.persistentHeaders),
        json.bankTimeZone ? `bankTimeZone = "${json.bankTimeZone}"` : "",
        customMapBlock(json.custom)
    ].filter(Boolean);

    if (bbConstructorParam) {
        const mainBlock = `BBConfiguration(${bbConstructorParam}) {
    ${dslLines.join("\n    ")}
}`;
        return `val bbConfiguration = ${mainBlock}\n\nBackbase.initialize(applicationContext, bbConfiguration)`;
    } else {
        const mainBlock = `BBConfiguration {
    ${dslLines.join("\n    ")}
}`;
        return `val bbConfiguration = ${mainBlock}\n\nBackbase.initialize(applicationContext, bbConfiguration)`;
    }
}
