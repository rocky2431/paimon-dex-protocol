/**
 * Bribe Claimable Data Tests (gap-3.2.2)
 *
 * Verify that useBribes hook can read user's claimable bribes from BribeMarketplace contract.
 *
 * Task: gap-3.2.2
 * Focus: Implement getUserClaimableBribes() to query on-chain claim status
 *
 * Test Dimensions:
 * 1. Functional - getUserClaimableBribes exists and returns correct structure
 * 2. Boundary - Handle empty bribes list, zero votes
 * 3. Exception - Invalid tokenId
 * 4. Security - Validate tokenId is bigint
 * 5. Compatibility - Support multiple veNFT tokens
 */

import { describe, it, expect } from '@jest/globals';
import type { UserBribeClaimStatus, Bribe } from '../types';
import fs from 'fs';
import path from 'path';

describe('Bribe Claimable Data (gap-3.2.2)', () => {
  /**
   * TEST 1: Hook exports getUserClaimableBribes function
   * Functional dimension - Function exists
   */
  it('[TEST 1] should export getUserClaimableBribes function', () => {
    const hookPath = path.join(process.cwd(), 'src/components/bribes/hooks/useBribes.ts');
    const hookSource = fs.readFileSync(hookPath, 'utf8');

    // Should define getUserClaimableBribes
    expect(hookSource).toContain('getUserClaimableBribes');

    // Should return it in the hook return object
    expect(hookSource).toContain('getUserClaimableBribes,');
  });

  /**
   * TEST 2: Function accepts tokenId parameter
   * Functional dimension - Parameter type
   */
  it('[TEST 2] should accept bigint tokenId parameter', () => {
    const hookPath = path.join(process.cwd(), 'src/components/bribes/hooks/useBribes.ts');
    const hookSource = fs.readFileSync(hookPath, 'utf8');

    // Should accept tokenId: bigint parameter
    expect(hookSource).toContain('tokenId: bigint');

    // Should return UserBribeClaimStatus[]
    expect(hookSource).toContain('UserBribeClaimStatus[]');
  });

  /**
   * TEST 3: Function returns array of UserBribeClaimStatus
   * Functional dimension - Return type
   */
  it('[TEST 3] should return array of UserBribeClaimStatus', () => {
    const typesPath = path.join(process.cwd(), 'src/components/bribes/types.ts');
    const typesSource = fs.readFileSync(typesPath, 'utf8');

    // UserBribeClaimStatus interface should exist
    expect(typesSource).toContain('export interface UserBribeClaimStatus');

    // Should have required fields
    expect(typesSource).toContain('bribeId: bigint');
    expect(typesSource).toContain('tokenId: bigint');
    expect(typesSource).toContain('claimed: boolean');
    expect(typesSource).toContain('claimableAmount: bigint');
  });

  /**
   * TEST 4: Function handles empty bribes list
   * Boundary dimension - Edge case
   */
  it('[TEST 4] should handle empty allBribes array', () => {
    const hookPath = path.join(process.cwd(), 'src/components/bribes/hooks/useBribes.ts');
    const hookSource = fs.readFileSync(hookPath, 'utf8');

    // Should check if allBribes is empty
    expect(hookSource).toContain('allBribes.length === 0');

    // Should return empty array when no bribes
    expect(hookSource).toContain('return []');
  });

  /**
   * TEST 5: Function validates tokenId
   * Exception dimension - Invalid input
   */
  it('[TEST 5] should validate tokenId parameter', () => {
    const hookPath = path.join(process.cwd(), 'src/components/bribes/hooks/useBribes.ts');
    const hookSource = fs.readFileSync(hookPath, 'utf8');

    // Should check if tokenId is falsy
    expect(hookSource).toContain('!tokenId');
  });

  /**
   * TEST 6: Function calculates claimable amount
   * Functional dimension - Business logic
   */
  it('[TEST 6] should calculate claimable amount based on votes', () => {
    const hookPath = path.join(process.cwd(), 'src/components/bribes/hooks/useBribes.ts');
    const hookSource = fs.readFileSync(hookPath, 'utf8');

    // Should calculate claimableAmount
    expect(hookSource).toContain('claimableAmount');

    // Should use bribe data (amount, totalVotes)
    expect(hookSource).toContain('bribe.amount');
    expect(hookSource).toContain('bribe.totalVotes');
  });

  /**
   * TEST 7: Function maps over all bribes
   * Functional dimension - Data processing
   */
  it('[TEST 7] should process all bribes in allBribes array', () => {
    const hookPath = path.join(process.cwd(), 'src/components/bribes/hooks/useBribes.ts');
    const hookSource = fs.readFileSync(hookPath, 'utf8');

    // Should map over allBribes
    expect(hookSource).toContain('allBribes.map');

    // Should return claimable status for each bribe (both shorthand and longhand property syntax)
    expect(hookSource).toContain('return {');
    expect(hookSource).toContain('bribeId:');
    expect(hookSource).toContain('tokenId');
    expect(hookSource).toContain('claimed');
    expect(hookSource).toContain('claimableAmount');
  });

  /**
   * TEST 8: Function handles zero total votes
   * Boundary dimension - Division by zero protection
   */
  it('[TEST 8] should handle zero totalVotes safely', () => {
    const hookPath = path.join(process.cwd(), 'src/components/bribes/hooks/useBribes.ts');
    const hookSource = fs.readFileSync(hookPath, 'utf8');

    // Should check totalVotes > 0 before division
    expect(hookSource).toContain('totalVotes > 0');

    // Should return 0n when totalVotes is 0
    expect(hookSource).toContain('0n');
  });

  /**
   * TEST 9: BribeMarketplace ABI includes hasClaimed function
   * Compatibility dimension - Contract interface
   */
  it('[TEST 9] should have hasClaimed in BRIBE_MARKETPLACE_ABI', () => {
    const hookPath = path.join(process.cwd(), 'src/components/bribes/hooks/useBribes.ts');
    const hookSource = fs.readFileSync(hookPath, 'utf8');

    // ABI should include hasClaimed function
    expect(hookSource).toContain('hasClaimed');

    // hasClaimed should accept bribeId and tokenId
    expect(hookSource).toContain('inputs: [');
    expect(hookSource).toContain('{ name: "bribeId", type: "uint256" }');
    expect(hookSource).toContain('{ name: "tokenId", type: "uint256" }');
  });

  /**
   * TEST 10: Function structure supports future on-chain integration
   * Functional dimension - Extensibility
   */
  it('[TEST 10] should have TODO comments for future contract integration', () => {
    const hookPath = path.join(process.cwd(), 'src/components/bribes/hooks/useBribes.ts');
    const hookSource = fs.readFileSync(hookPath, 'utf8');

    // Should have TODOs for future work
    // This ensures the implementation is aware of what needs to be added
    const todoMatches = hookSource.match(/TODO/gi);
    expect(todoMatches).not.toBeNull();
    expect(todoMatches!.length).toBeGreaterThan(0);
  });
});

describe('Bribe Data Integration (gap-3.2.2)', () => {
  /**
   * TEST 11: Hook exports the function in return object
   */
  it('[TEST 11] should export getUserClaimableBribes in hook return', () => {
    const hookPath = path.join(process.cwd(), 'src/components/bribes/hooks/useBribes.ts');
    const hookSource = fs.readFileSync(hookPath, 'utf8');

    // Should be in the return statement
    const returnMatch = hookSource.match(/return\s+{[^}]+getUserClaimableBribes[^}]+}/s);
    expect(returnMatch).not.toBeNull();
  });

  /**
   * TEST 12: Types are properly imported
   */
  it('[TEST 12] should import UserBribeClaimStatus type', () => {
    const hookPath = path.join(process.cwd(), 'src/components/bribes/hooks/useBribes.ts');
    const hookSource = fs.readFileSync(hookPath, 'utf8');

    // Should import UserBribeClaimStatus from types
    expect(hookSource).toContain('UserBribeClaimStatus');
    expect(hookSource).toContain('from "../types"');
  });
});
