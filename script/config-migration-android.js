function identityBlock(identity) {
    if (!identity) return "";

    return `identityConfiguration = IdentityConfiguration {
        ${identity.baseURL ? `baseUrl = "${identity.baseURL}"` : ""}
        ${identity.realm ? `realm = "${identity.realm}"` : ""}
        ${identity.clientId ? `clientId = "${identity.clientId}"` : ""}
        ${identity.applicationKey ? `applicationKey = "${identity.applicationKey}"` : ""}
    }`;
}

function oAuth2Block(oauth) {
    if (!oauth) return "";

    return `oAuth2Configuration = OAuth2Configuration {
        ${oauth.tokenEndpoint ? `tokenEndpoint = "${oauth.tokenEndpoint}"` : ""}
        ${oauth.clientId ? `clientId = "${oauth.clientId}"` : ""}
    }`;
}

function allowedDomainsBlock(domains) {
    if (!domains || !domains.length) return "";
    const items = domains.map(d => `"${d}"`).join(",\n        ");
    return `allowedDomains = listOf(
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

    const mainBlock = `
BBConfiguration {
    ${serverURL ? `serverUrl = "${serverURL}"` : ""}
    ${version ? `version = "${version}"` : ""}
    ${sessionCookieName ? `sessionCookieName = "${sessionCookieName}"` : ""}
    ${csrfCookieName ? `csrfCookieName = "${csrfCookieName}"` : ""}
    ${csrfHeaderName ? `csrfHeaderName = "${csrfHeaderName}"` : ""}
    ${identityBlock(identity)}
    ${oAuth2Block(oAuth2)}
    ${allowedDomainsBlock(json.security?.allowedDomains)}
    ${allowedAppSignaturesBlock(json.security?.allowedAppSignatures)}
    ${persistentHeadersBlock(json.persistentHeaders)}
    ${json.bankTimeZone ? `bankTimeZone = "${json.bankTimeZone}"` : ""}
}`.trim().replace(/^\s*\n/gm, "");

    const customBlock = customPropertiesBlock(json.custom);

    return [mainBlock, "", customBlock].filter(Boolean).join("\n\n");
}
