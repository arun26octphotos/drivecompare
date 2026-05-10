# Requirements Document

## Introduction

The Car Insurance Comparison Platform allows customers to enter their vehicle details once and receive insurance quotes from multiple providers simultaneously. The platform addresses the pain point of customers having to contact each insurer individually when their policy is up for renewal. It also proactively alerts customers every 6 months with the best available rates, helping them save money without the effort of manually shopping around.

## Glossary

- **Platform**: The car insurance comparison web application described in this document.
- **Customer**: A registered user who submits vehicle information and receives insurance quotes.
- **Vehicle**: A car identified by its VIN, make, model, year, and other relevant attributes.
- **VIN**: Vehicle Identification Number — a unique 17-character code identifying a specific vehicle.
- **Quote**: An estimated insurance premium returned by an insurance provider for a given vehicle and customer profile.
- **Provider**: An insurance company integrated with the Platform that supplies quotes.
- **Quote_Request**: A submission by a Customer containing vehicle and personal details used to retrieve quotes from Providers.
- **Alert**: A scheduled notification sent to a Customer containing updated quotes from Providers.
- **Quote_Aggregator**: The Platform component responsible for collecting quotes from all integrated Providers.
- **Notification_Service**: The Platform component responsible for sending scheduled and event-driven alerts to Customers.
- **VIN_Decoder**: The Platform component that resolves vehicle make, model, and year from a VIN.

---

## Requirements

### Requirement 1: Customer Registration and Authentication

**User Story:** As a customer, I want to create an account and log in securely, so that my vehicle details and quote history are saved and accessible only to me.

#### Acceptance Criteria

1. THE Platform SHALL allow a Customer to register using an email address and password.
2. WHEN a Customer submits a registration form, THE Platform SHALL validate that the email address is unique and properly formatted before creating the account.
3. IF a Customer attempts to register with an email address already associated with an existing account, THEN THE Platform SHALL return an error message indicating the email is already in use.
4. WHEN a Customer provides valid credentials, THE Platform SHALL authenticate the Customer and establish a session.
5. IF a Customer provides invalid credentials, THEN THE Platform SHALL return an error message without revealing which field is incorrect.
6. WHEN a Customer session is inactive for 30 minutes, THE Platform SHALL invalidate the session and require re-authentication.

---

### Requirement 2: Vehicle Details Entry

**User Story:** As a customer, I want to enter my vehicle details once using the VIN or manually, so that I don't have to re-enter the same information every time I want a quote.

#### Acceptance Criteria

1. THE Platform SHALL allow a Customer to add a vehicle by entering a 17-character VIN.
2. WHEN a valid VIN is submitted, THE VIN_Decoder SHALL automatically populate the vehicle's make, model, and year.
3. IF the VIN_Decoder cannot resolve a submitted VIN, THEN THE Platform SHALL allow the Customer to enter the make, model, and year manually.
4. THE Platform SHALL allow a Customer to add up to 5 vehicles to their account.
5. THE Platform SHALL allow a Customer to edit or remove a previously saved vehicle.
6. WHEN a Customer removes a vehicle, THE Platform SHALL retain historical quotes associated with that vehicle for 12 months.

---

### Requirement 3: Quote Retrieval

**User Story:** As a customer, I want to submit my vehicle details and receive quotes from multiple insurance providers at once, so that I can compare rates without contacting each provider individually.

#### Acceptance Criteria

1. WHEN a Customer initiates a Quote_Request for a saved vehicle, THE Quote_Aggregator SHALL request quotes from all integrated Providers concurrently.
2. WHEN all Provider responses are received, THE Platform SHALL display the quotes sorted by premium amount in ascending order.
3. WHEN a Provider returns a quote, THE Platform SHALL display the Provider name, annual premium, monthly premium, coverage type, and a link to the Provider's website.
4. IF a Provider fails to respond within 10 seconds, THEN THE Quote_Aggregator SHALL exclude that Provider's quote from the results and display a notice indicating the Provider was unavailable.
5. WHEN at least one quote is available, THE Platform SHALL display results to the Customer within 15 seconds of the Quote_Request being submitted.
6. IF no Providers return a quote, THEN THE Platform SHALL display an error message advising the Customer to try again later.
7. THE Platform SHALL store each Quote_Request and its results, associated with the Customer's account, for 12 months.

---

### Requirement 4: Quote Comparison View

**User Story:** As a customer, I want to compare quotes side by side with clear breakdowns, so that I can make an informed decision about which provider to choose.

#### Acceptance Criteria

1. THE Platform SHALL display all returned quotes in a comparison table showing Provider name, coverage type, annual premium, monthly premium, and deductible.
2. THE Platform SHALL visually highlight the lowest-priced quote in the comparison table.
3. WHEN a Customer selects a quote, THE Platform SHALL display a detailed breakdown including coverage limits, exclusions, and a direct link to the Provider's purchase page.
4. THE Platform SHALL allow a Customer to filter quotes by coverage type (e.g., liability only, comprehensive, collision).
5. THE Platform SHALL allow a Customer to sort quotes by annual premium, monthly premium, or Provider name.

---

### Requirement 5: Scheduled Rate Alerts

**User Story:** As a customer, I want to be alerted every 6 months with the best available rates for my vehicles, so that I can switch providers if a better deal is available without having to remember to check manually.

#### Acceptance Criteria

1. WHEN a Customer saves a vehicle, THE Notification_Service SHALL schedule a recurring Alert for that vehicle at 6-month intervals.
2. WHEN an Alert is due, THE Quote_Aggregator SHALL retrieve current quotes from all integrated Providers for the associated vehicle.
3. WHEN the Alert quotes are retrieved, THE Notification_Service SHALL send an email to the Customer containing the top 3 lowest-priced quotes, each with Provider name, annual premium, and a link to the Provider's website.
4. THE Notification_Service SHALL send the Alert email no later than 24 hours after the scheduled Alert date.
5. THE Platform SHALL allow a Customer to adjust the Alert frequency to 3 months or 12 months in place of the default 6-month interval.
6. THE Platform SHALL allow a Customer to unsubscribe from Alerts for a specific vehicle without removing the vehicle from their account.
7. IF an Alert email fails to deliver, THEN THE Notification_Service SHALL retry delivery up to 3 times at 1-hour intervals before marking the Alert as failed.

---

### Requirement 6: Provider Integration

**User Story:** As a platform operator, I want to integrate with multiple insurance providers via APIs, so that the platform can retrieve real-time quotes programmatically.

#### Acceptance Criteria

1. THE Quote_Aggregator SHALL support integration with a minimum of 5 insurance Providers at launch.
2. WHEN a Provider's API returns an error response, THE Quote_Aggregator SHALL log the error with the Provider name, error code, and timestamp.
3. THE Platform SHALL allow new Providers to be added without requiring changes to the Customer-facing interface.
4. WHEN a Provider's API schema changes, THE Platform SHALL continue to serve quotes from other Providers while the affected Provider integration is updated.
5. THE Quote_Aggregator SHALL authenticate with each Provider's API using credentials stored in a secure secrets store, not in application source code.

---

### Requirement 7: Data Privacy and Security

**User Story:** As a customer, I want my personal and vehicle data to be stored and transmitted securely, so that my information is not exposed to unauthorized parties.

#### Acceptance Criteria

1. THE Platform SHALL transmit all data between the Customer's browser and the Platform using TLS 1.2 or higher.
2. THE Platform SHALL store Customer passwords as salted cryptographic hashes using an algorithm with a work factor of at least bcrypt cost 12.
3. THE Platform SHALL restrict access to a Customer's vehicle details and quote history to that Customer's authenticated session.
4. WHEN a Customer requests deletion of their account, THE Platform SHALL permanently delete all associated personal data within 30 days.
5. THE Platform SHALL not share Customer personal data with Providers beyond the minimum fields required to generate a quote.

