// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Turf — onchain turf war keyed by OpenStreetMap way IDs.
/// @notice No geometry onchain. A building is just its OSM `way/id`, and the
///         only state worth storing is which team last tapped it. Claims are
///         always overwritable: a settled map is a boring demo.
contract Turf {
    /// @dev Team 0 means "unclaimed". Valid teams are 1..teamCount.
    uint8 public immutable teamCount;

    /// @notice osmWayId => team that currently holds it (0 = neutral).
    mapping(uint256 => uint8) public teamOf;

    /// @notice team => number of buildings it currently holds.
    mapping(uint8 => uint32) public scoreOf;

    /// @notice Every claim, including overwrites. This is the indexing feed:
    ///         the frontend replays these to paint the map, then tails new ones.
    event Claimed(uint256 indexed osmWayId, uint8 indexed team, uint8 previousTeam, address indexed player);

    error BadTeam(uint8 team);
    error NothingToClaim();

    constructor(uint8 _teamCount) {
        if (_teamCount == 0) revert BadTeam(_teamCount);
        teamCount = _teamCount;
    }

    /// @notice Claim one building for `team`, taking it from whoever held it.
    function claim(uint256 osmWayId, uint8 team) external {
        if (team == 0 || team > teamCount) revert BadTeam(team);
        _claim(osmWayId, team);
    }

    /// @notice Claim a whole block in one transaction. Same cost per building,
    ///         one signature — this is what lets a player drag across a street.
    function claimMany(uint256[] calldata osmWayIds, uint8 team) external {
        if (team == 0 || team > teamCount) revert BadTeam(team);
        if (osmWayIds.length == 0) revert NothingToClaim();
        for (uint256 i = 0; i < osmWayIds.length; ++i) {
            _claim(osmWayIds[i], team);
        }
    }

    /// @notice Batch read for hydrating a fresh client without replaying logs.
    function teamsOf(uint256[] calldata osmWayIds) external view returns (uint8[] memory teams) {
        teams = new uint8[](osmWayIds.length);
        for (uint256 i = 0; i < osmWayIds.length; ++i) {
            teams[i] = teamOf[osmWayIds[i]];
        }
    }

    /// @notice Scoreboard, indexed 0..teamCount-1 for teams 1..teamCount.
    function scores() external view returns (uint32[] memory out) {
        out = new uint32[](teamCount);
        for (uint8 t = 1; t <= teamCount; ++t) {
            out[t - 1] = scoreOf[t];
        }
    }

    function _claim(uint256 osmWayId, uint8 team) internal {
        uint8 previous = teamOf[osmWayId];
        if (previous == team) return; // re-tapping your own building is a no-op, not a revert
        teamOf[osmWayId] = team;
        if (previous != 0) scoreOf[previous] -= 1;
        scoreOf[team] += 1;
        emit Claimed(osmWayId, team, previous, msg.sender);
    }
}
