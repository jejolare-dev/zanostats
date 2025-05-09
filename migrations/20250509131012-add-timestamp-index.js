'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addIndex('transactions', ['timestamp'], {
      name: 'idx_transactions_timestamp'
    });
    await queryInterface.addIndex('blocks', ['timestamp'], {
      name: 'idx_blocks_timestamp'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('transactions', 'idx_transactions_timestamp');
    await queryInterface.removeIndex('blocks', 'idx_blocks_timestamp');
  }
};
