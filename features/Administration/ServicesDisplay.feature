Feature: Services display

  Rule: Glocal contracts
    Background:
      Given I am a platform administrator on the application
      * I am on the application
      * I switch to "Administration" mode
      * a parent company "RAINBOW MOTORS INC" with a legal contract "22815092700"
      * the legal contract "22815092700" has the following services:
        | id | name            |
        | 1  | ROADASSIST PRO  |
        | 2  | CRASH COVER     |
        | 3  | THEFT GUARD     |
        | 4  | GLASS SHIELD    |
        | 5  | TIRE PROTECT    |
      * I am on the search page
      * I search by contract number "22815092700"

    @feat:25166
    Scenario: Display the service removal modal
      When I click the button to remove the service "THEFT GUARD"
      Then I should see the removal confirmation message for service "THEFT GUARD"

    @feat:25166
    Scenario: Remove a service
      When I click the button to remove the service "THEFT GUARD"
      And I click the confirm button in the removal modal for service "THEFT GUARD"
      Then the service "THEFT GUARD" is no longer present in the displayed service list
      And the removal modal for service "THEFT GUARD" should disappear

    @feat:25167
    Scenario: Display the service addition modal
      When I click the "Other services" tab
      And I click the button to add the service "THEFT GUARD"
      Then I should see the addition confirmation message for service "THEFT GUARD"

    @feat:25167
    Scenario: Add a service
      When I click the "Other services" tab
      And I click the button to add the service "THEFT GUARD"
      And I click the confirm button in the addition modal for service "THEFT GUARD"
      Then the service "THEFT GUARD" is no longer present in the displayed service list
      And the addition modal for service "THEFT GUARD" should disappear

  Rule: Individual contracts
    Background:
      Given I am a platform administrator on the application
      * I am on the application
      * I switch to "Administration" mode
      * the individual contract "0000000000492904"
      * the individual contract "0000000000492904" has the following services:
      | name            |
      | ROADASSIST PRO  |
      | CRASH COVER     |
      | THEFT GUARD     |
      | GLASS SHIELD    |
      | TIRE PROTECT    |
      * I am on the search page
      * I search by contract number "0000000000492904"
