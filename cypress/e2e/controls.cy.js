describe('CONTROLS', () => {
  const defaultWait = 500;

  beforeEach(() => {
    // Visit the page on desktop
    cy.viewport(1920, 1080);
    cy.visit('/controls.html');
  });

  afterEach(() => {
    cy.reload(true);
  });

  it('should toggle play/pause when clicking the player on desktop', () => {
    const fullPlayer = cy.get('#fluid_video_wrapper_fluid-player-e2e-case');
    const playerElement = cy.get('video');

    // Click and check if video is playing
    fullPlayer.click();
    cy.wait(defaultWait);
    playerElement.then(($video) => {
      expect($video[0].paused).to.be.false;
    });
    cy.get('.fluid_button_pause').should('be.visible');

    // Wait before clicking again, otherwise click can be throttled and not trigger
    cy.wait(defaultWait);

    // Click and check if video is paused
    fullPlayer.click();
    cy.wait(defaultWait);
    playerElement.then(($video) => {
      expect($video[0].paused).to.be.true;
      cy.get('.fluid_button_play').should('be.visible');
    });
  });

  it('should not toggle play/pause when clicking the player on mobile', () => {
    // Switch to a mobile viewport
    cy.viewport('iphone-x');
    cy.reload();

    const fullPlayer = cy.get('#fluid_video_wrapper_fluid-player-e2e-case');
    const playerElement = cy.get('video');

    // Click and check if video is playing
    fullPlayer.click();
    cy.wait(defaultWait);
    playerElement.then(($video) => {
      expect($video[0].paused).to.be.false;
    });
    cy.get('.fluid_button_pause').should('be.visible');

    // Wait before clicking again, otherwise click can be throttled and not trigger
    cy.wait(defaultWait);

    // Click and check if video is paused
    fullPlayer.click();
    cy.wait(defaultWait);
    playerElement.then(($video) => {
      expect($video[0].paused).to.be.false;
      cy.get('.fluid_button_play').should('be.visible');
    });
  });
});