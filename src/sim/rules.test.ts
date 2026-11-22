import { describe, expect, it } from 'vitest';
import { attackDir, restartFor, scoringTeam, TEAM_AWAY, TEAM_HOME } from './rules';

describe('attackDir / scoringTeam', () => {
  it('전반에는 홈이 +x, 원정이 -x로 공격한다', () => {
    expect(attackDir(TEAM_HOME, 1)).toBe(1);
    expect(attackDir(TEAM_AWAY, 1)).toBe(-1);
  });

  it('+x 골문에 들어가면 전반엔 홈 득점, 후반엔 원정 득점', () => {
    expect(scoringTeam(1, 1)).toBe(TEAM_HOME);
    expect(scoringTeam(1, -1)).toBe(TEAM_AWAY);
    expect(scoringTeam(-1, 1)).toBe(TEAM_AWAY);
  });
});

describe('restartFor (전반, 홈은 +x 공격 → +x 골문은 원정이 지킴)', () => {
  it('터치라인: 마지막 터치의 상대 팀 스로인', () => {
    expect(restartFor('touch', 1, TEAM_HOME, 1)).toEqual({ restart: 'throwIn', team: TEAM_AWAY });
    expect(restartFor('touch', -1, TEAM_AWAY, 1)).toEqual({ restart: 'throwIn', team: TEAM_HOME });
  });

  it('골라인 + 수비팀 마지막 터치 → 공격팀 코너킥', () => {
    expect(restartFor('goal', 1, TEAM_AWAY, 1)).toEqual({
      restart: 'cornerKick',
      team: TEAM_HOME,
    });
    expect(restartFor('goal', -1, TEAM_HOME, 1)).toEqual({
      restart: 'cornerKick',
      team: TEAM_AWAY,
    });
  });

  it('골라인 + 공격팀 마지막 터치 → 수비팀 골킥', () => {
    expect(restartFor('goal', 1, TEAM_HOME, 1)).toEqual({ restart: 'goalKick', team: TEAM_AWAY });
    expect(restartFor('goal', -1, TEAM_AWAY, 1)).toEqual({ restart: 'goalKick', team: TEAM_HOME });
  });

  it('후반에는 진영이 바뀐다', () => {
    // 후반: 홈은 -x 공격 → +x 골문은 홈이 지킴. 홈이 마지막 터치 → 원정 코너킥
    expect(restartFor('goal', 1, TEAM_HOME, -1)).toEqual({
      restart: 'cornerKick',
      team: TEAM_AWAY,
    });
  });

  it('마지막 터치가 없으면 홈이 찬 것으로 본다', () => {
    expect(restartFor('goal', 1, -1, 1)).toEqual({ restart: 'goalKick', team: TEAM_AWAY });
  });
});
