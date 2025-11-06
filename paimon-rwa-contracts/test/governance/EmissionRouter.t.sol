// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../src/governance/EmissionManager.sol";
import "../../src/governance/EmissionRouter.sol";
import "../../src/mocks/MockERC20.sol";

contract EmissionRouterTest is Test {
    EmissionManager public emissionManager;
    EmissionRouter public router;
    MockERC20 public paimonToken;

    address public debtSink = makeAddr("debtSink");
    address public lpSink = makeAddr("lpSink");
    address public stabilitySink = makeAddr("stabilitySink");
    address public ecoSink = makeAddr("ecoSink");
    address public policyOperator = makeAddr("policy");

    function setUp() public {
        emissionManager = new EmissionManager();
        paimonToken = new MockERC20("PAIMON", "PAIMON", 18);
        router = new EmissionRouter(address(emissionManager), address(paimonToken));
        router.setSinks(debtSink, lpSink, stabilitySink, ecoSink);
    }

    function testRouteWeekTransfersBudget() public {
        uint256 week = 1;
        (uint256 debt, uint256 lpPairs, uint256 stability, uint256 eco) = emissionManager.getWeeklyBudget(week);
        uint256 total = debt + lpPairs + stability + eco;

        paimonToken.mint(address(router), total);

        router.routeWeek(week);

        assertTrue(router.routedWeek(week), "Week should be marked as routed");
        assertEq(paimonToken.balanceOf(debtSink), debt, "Debt sink incorrect");
        assertEq(paimonToken.balanceOf(lpSink), lpPairs, "LP sink incorrect");
        assertEq(paimonToken.balanceOf(stabilitySink), stability, "Stability sink incorrect");
        assertEq(paimonToken.balanceOf(ecoSink), eco, "Eco sink incorrect");
        assertEq(paimonToken.balanceOf(address(router)), 0, "Router residual balance");
    }

    function testRouteWeekRevertsWhenAlreadyRouted() public {
        uint256 week = 1;
        (uint256 debt, uint256 lpPairs, uint256 stability, uint256 eco) = emissionManager.getWeeklyBudget(week);
        uint256 total = debt + lpPairs + stability + eco;

        paimonToken.mint(address(router), total);
        router.routeWeek(week);

        vm.expectRevert("EmissionRouter: already routed");
        router.routeWeek(week);
    }

    function testRouteWeekRequiresSink() public {
        router.setSinks(address(0), lpSink, stabilitySink, ecoSink);

        (uint256 debt, uint256 lpPairs, uint256 stability, uint256 eco) = emissionManager.getWeeklyBudget(1);
        uint256 total = debt + lpPairs + stability + eco;
        paimonToken.mint(address(router), total);

        vm.expectRevert(bytes("EmissionRouter: debt sink not set"));
        router.routeWeek(1);
    }

    function testPolicyOperatorCanRouteAfterGrant() public {
        uint256 week = 2;
        (uint256 debt, uint256 lpPairs, uint256 stability, uint256 eco) = emissionManager.getWeeklyBudget(week);
        uint256 total = debt + lpPairs + stability + eco;
        paimonToken.mint(address(router), total);

        router.grantEmissionPolicy(policyOperator);
        vm.prank(policyOperator);
        router.routeWeek(week);

        assertTrue(router.routedWeek(week), "Granted policy operator should route");
    }
}

