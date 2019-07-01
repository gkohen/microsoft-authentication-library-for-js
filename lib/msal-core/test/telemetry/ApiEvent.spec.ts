import { v4 as uuid } from "uuid";
import ApiEvent, {
    API_EVENT_IDENTIFIER,
    API_CODE, API_ERROR_CODE_KEY,
    WAS_SUCESSFUL_KEY,
    AUTHORITY_TYPE_KEY,
    PROMPT_KEY,
    AUTHORITY_KEY,
    TENANT_ID_KEY,
    USER_ID_KEY,
    LOGIN_HINT_KEY
} from "../../src/telemetry/ApiEvent";
import { Logger } from "../../src";
import { expect } from "chai";
import { TELEMETRY_BLOB_EVENT_NAMES } from "../../src/telemetry/TelemetryConstants";
import { hashPersonalIdentifier } from "../../src/telemetry/TelemetryUtils";

describe("ApiEvent", () => {
    it("constructs and carries exepcted values", () => {
        const correlationId = uuid();
        const logger = new Logger(() => { });

        const event = new ApiEvent(correlationId, logger).get();

        expect(event["msal.event_name"]).to.eq("msal.api_event");
        expect(event["msal.elapsed_time"]).to.eq(-1);
    });

    it("sets simple values on event", () => {
        const correlationId = uuid();
        const logger = new Logger(() => { });

        const apiEvent = new ApiEvent(correlationId, logger);

        const fakeErrorCode = "PIZZA";
        const fakeWasSuccessful = true;
        const fakeAuthorityType = "B2C";
        const fakePromptType = "SELECT_ACCOUNT";

        apiEvent.apiEventIdentifier = API_EVENT_IDENTIFIER.AcquireTokenPopup;
        apiEvent.apiCode = API_CODE.AcquireTokenPopup;
        apiEvent.apiErrorCode = fakeErrorCode;
        apiEvent.wasSuccessful = fakeWasSuccessful;
        apiEvent.authorityType = fakeAuthorityType;
        apiEvent.promptType = fakePromptType;

        const event = apiEvent.get();

        expect(event[TELEMETRY_BLOB_EVENT_NAMES.ApiTelemIdConstStrKey]).to.eq(API_EVENT_IDENTIFIER.AcquireTokenPopup);
        expect(event[TELEMETRY_BLOB_EVENT_NAMES.ApiIdConstStrKey]).to.eq(API_CODE.AcquireTokenPopup);
        expect(event[API_ERROR_CODE_KEY]).to.eq(fakeErrorCode);
        expect(event[WAS_SUCESSFUL_KEY]).to.eq(fakeWasSuccessful);
        expect(event[AUTHORITY_TYPE_KEY]).to.eq(fakeAuthorityType.toLowerCase());
        expect(event[PROMPT_KEY]).to.eq(fakePromptType.toLowerCase());
    });

    it("sets values on event that are scrubbed or altered", () => {
        const correlationId = uuid();
        const logger = new Logger(() => { });

        const apiEvent = new ApiEvent(correlationId, logger);

        const fakeAuthority = "https://login.microsoftonline.com/Abc-123/I-am-a-tenant/orange";
        const expectedFakeAuthority = "https://login.microsoftonline.com/abc-123/<tenant>/orange";

        apiEvent.authority = fakeAuthority;

        const event = apiEvent.get();

        expect(event[AUTHORITY_KEY]).to.eq(expectedFakeAuthority);
    });

    it("doesn't set private alues on event if pii is not enabled", () => {
        const correlationId = uuid();
        const logger = new Logger(() => { }, {
            piiLoggingEnabled: false //defaults to false
        });

        const apiEvent = new ApiEvent(correlationId, logger);

        const fakeTenantId = uuid();
        const fakeAccountId = uuid();
        const fakeLoginHint = "fakeHint";

        apiEvent.tenantId = fakeTenantId;
        apiEvent.accountId = fakeAccountId;
        apiEvent.loginHint = fakeLoginHint;

        const event = apiEvent.get();

        expect(event[TENANT_ID_KEY]).to.eq(null);
        expect(event[USER_ID_KEY]).to.eq(null);
        expect(event[LOGIN_HINT_KEY]).to.eq(null);
    });

    it("sets and hashes private values on event if pii is enabled", () => {
        const correlationId = uuid();
        const logger = new Logger(() => { }, {
            piiLoggingEnabled: true
        });

        const apiEvent = new ApiEvent(correlationId, logger);

        const fakeTenantId = uuid();
        const fakeExpectedTenantId = hashPersonalIdentifier(fakeTenantId);
        const fakeAccountId = uuid();
        const fakeExpectedAccountId = hashPersonalIdentifier(fakeAccountId);
        const fakeLoginHint = "fakeHint";
        const fakeExpectedHint = hashPersonalIdentifier(fakeLoginHint);

        apiEvent.tenantId = fakeTenantId;
        apiEvent.accountId = fakeAccountId;
        apiEvent.loginHint = fakeLoginHint;

        const event = apiEvent.get();

        expect(event[TENANT_ID_KEY]).to.eq(fakeExpectedTenantId);
        expect(event[USER_ID_KEY]).to.eq(fakeExpectedAccountId);
        expect(event[LOGIN_HINT_KEY]).to.eq(fakeExpectedHint);
    });

});