Feature: Unconfigured warranty alert

    Scenario: Display alert when some warranties are not configured
        Given unconfigured warranties exist
        When I am on the main page
        Then an alert is displayed with the message "Warning: You have new warranties to configure"
        And a download link is visible

    Scenario: No alert when all warranties are configured
        Given no unconfigured warranties exist
        When I am on the main page
        Then no alert is displayed

    Scenario: Download the warranty alert file
        Given unconfigured warranties exist
        And a warranty alert file is available
        When I am on the main page
        And I click the download link
        Then the file is downloaded successfully

    Scenario: Warranty alert file unavailable
        Given unconfigured warranties exist
        And retrieving the warranty alert file produces the error "Unable to download the warranty alert file"
        When I am on the main page
        And I click the download link
        Then an error message is displayed with the text "Unable to download the warranty alert file"
        But the file is not downloaded
