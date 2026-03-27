@feat:30103

Feature: Agreement selection on a service to add

  Scenario: Cannot select an agreement on a service with no agreement
    When I have a non-held service card with no agreement
    Then the "select" button does not appear

  Scenario: Cannot select an agreement on a service with a single agreement
    When I have a non-held service card with a single agreement
    Then the "select" button does not appear

  Scenario: Loading agreements when selecting an agreement
    Given the contract "22815092700" is selected
    When I have a non-held service card with multiple associated agreements
    And I click the "select" button
    Then the agreements have finished loading

  Scenario: Select an agreement on a service with multiple associated agreements
    Given the contract "22815092700" is selected
    When I have a non-held service card with multiple associated agreements
    And I click the "select" button
    And I click on the agreement "NATIONAL FLEET WARRANTY"
    And I click the "confirm" button
    Then the agreement "7203821" is selected

  Scenario: Cancel agreement selection
    When I have a non-held service card with multiple associated agreements
    And I click the "select" button
    And I click the "cancel" button
    Then no agreement is selected

  Scenario: Modify an agreement after selection
    Given the contract "22815092700" is selected
    When I have a non-held service card with multiple associated agreements
    And I click the "select" button
    And I click on the agreement "NATIONAL FLEET WARRANTY"
    And I click the "confirm" button
    And I click the "modify" button
    And I click on the agreement "GLOBAL ROADSIDE SECURE"
    And I click the "confirm" button
    Then the agreement "0803471" is selected
