Feature: Input validation with regex patterns

  Scenario: Validate numbers
    Given a field matching pattern "123"
    When I validate input "(123)"
    Then the validation succeeds
