describe('ADS', () => {
  const defaultWait = 500;

  beforeEach(() => {
    // Visit the page on desktop
    // cy.viewport(1920, 1080);
    cy.visit('/ads_linear.html');
  });

  afterEach(() => {
    cy.reload(true);
  });

  it('should navigate to the publishers advertised website on click', () => {
    const fullPlayer = cy.get('#fluid_video_wrapper_fluid-player-e2e-case');
    const playerElement = cy.get('video');

  });

  it('should fire pre-, mid- and postRoll based on time', () => {
    const fullPlayer = cy.get('#fluid_video_wrapper_fluid-player-e2e-case');
    const playerElement = cy.get('video');

    fullPlayer.click();
    // wait for the ad to be loaded
    cy.wait(defaultWait);

    playerElement.then(($video) => {
      // TODO: figure out how to check if the video that is playing (aka the preroll video) Maybe based on src url?
      $video
    });
  });

  it('ad should not be skipped when the ad countdown is not done', () => {
    const fullPlayer = cy.get('#fluid_video_wrapper_fluid-player-e2e-case');
    const playerElement = cy.get('video');
    const skipButton = cy.get('.skip_button');

    // skipButton.should('contain', 'skip video in');
    skipButton.should('have.text', 'skip video in 4');

    skipButton.click();

    // TODO: should also test if the same video is still playing in the DOM
    skipButton.should('have.text', 'skip video in 2');
  });

  it('ad should be skipped when ad countdown is done and skip ad functionilty is visible', () => {
    const fullPlayer = cy.get('#fluid_video_wrapper_fluid-player-e2e-case');
    const playerElement = cy.get('video');

  });

  it('clicking skip ad after a midRoll should resume the main video where it was interupted', () => {
    const fullPlayer = cy.get('#fluid_video_wrapper_fluid-player-e2e-case');
    const playerElement = cy.get('video');

  });

  it('click tracking should fire the respective url', () => {
    const fullPlayer = cy.get('#fluid_video_wrapper_fluid-player-e2e-case');
    const playerElement = cy.get('video');

  });

  it('impression tracking should fire at the configured time to the correct url', () => {
    const fullPlayer = cy.get('#fluid_video_wrapper_fluid-player-e2e-case');
    const playerElement = cy.get('video');

  });

});