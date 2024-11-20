describe('CONTROLS', () => {
  const defaultWait = 500;
  let iphonexUA = null;

  before(() => {
    cy.fixture('viewports.json').as('viewports');
    // Set the iphone 14 header from fixtures/viewports.json
    cy.get('@viewports').then((viewports) => {
      iphonexUA = viewports.iphonex.userAgent;
    });
  });

  beforeEach(() => {
    // Visit the page on desktop
    // cy.viewport(1920, 1080);
    cy.visit('/controls.html');
  });

  afterEach(() => {
    cy.reload(true);
  });

  it('should toggle play/pause when clicking the player on desktop', () => {
    // cy.visit('/controls.html');

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

    /**
   * TODO: if we circle back to this, here are the following notes:
   * The good:
   * - quite clean way of working
   * - easy to understand
   * - for desktop only applications
   * 
   * The bad
   *  mobile is completely unsable
   *  The "viewport" change is literally only a width and height
   *  You can change the headers to be mobile, but cypress still treats it as a regular desktop
   *  sometimes touchend or touchstart works as a click, but sometimes you have to use .click itself for some reason. It's just unpredictable
   *  Even when touchend or touchstart works, the behaviour of the app can be super weird.
   *
   *  I've tried :
   *  - clicking with touchstart and touchend
   *  - changing the user-agent
   *  - changing the "window" so it thinks it has touchpoints (which is how we test if it's a touch device)
   */

  it('should not toggle play/pause when clicking the player on mobile', () => {
    // Switch to a mobile viewport
    cy.viewport('iphone-x');
    // cy.intercept({
    //   method: 'GET',
    //   url: '*',
    // }, (req) => {
    //   req.headers['User-Agent'] = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1';
    // });
    // // Simulate mobile environment
    // cy.document().then((doc) => {
    //   Object.defineProperty(doc, 'documentElement', {
    //     get: () => ({
    //       ontouchstart: true,
    //       ontouchend: true
    //     })
    //   });
    // });
    cy.on('window:before:load', (win) => {
      Object.defineProperty(win, 'ontouchstart', {
        get() { return true; }
      });
  
      Object.defineProperty(win.navigator, 'maxTouchPoints', {
        get() { return 1; }
      });
    });
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

    // Wait before clicking again, so the controls can disappear
    cy.wait(5000);

    // Click and check if video is paused
    fullPlayer.click();
    fullPlayer.trigger('touchstart').trigger('touchend');
    cy.wait(2000);
    playerElement.then(($video) => {
      expect($video[0].paused).to.be.false;
      cy.get('.fluid_button_play').should('be.visible');
    });
  });
});