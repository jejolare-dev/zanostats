'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.renameColumn('stats', 'stacked_coins', 'staked_coins');
    await queryInterface.renameColumn('stats', 'stacked_percentage', 'staked_percentage');
  },

  down: async (queryInterface, Sequelize) => {
    // Reverse the column names if migration is rolled back
    await queryInterface.renameColumn('stats', 'staked_coins', 'stacked_coins');
    await queryInterface.renameColumn('stats', 'staked_percentage', 'stacked_percentage');
  },
};

