import React from "react"; 
// Import React library, required to define React components


import "../../RealEstate.css";
// Import the CSS file for styling the component

const TransactionTable = ({ transactions = [] }) => { 
  // Define a functional component named TransactionTable

  // It receives props and destructures 'transactions' from props
  // Props are inputs that a React component receives from its parent.
  // destructuring is a way to extract values from objects easily.

  // transactions is an array of transaction objects, defaulting to empty array if not provided

  return (
    <div className="table-container">
      {/* Main container for the transaction table */}

      <h3>Transactions</h3>
      {/* Title for the table */}

      <table className="transaction-table">
        {/* HTML table element with CSS class for styling */}

        <thead>
          <tr>
            <th>Date</th>
            <th>Amount</th>
            <th>Property</th>
          </tr>
        </thead>
        {/* Table header with three columns: Date, Amount, Property */}

        <tbody>
          {transactions.length > 0 ? (
            // If there are transactions, map over each transaction object
            transactions.map((t, index) => (
              <tr key={index}>
                {/* Each row represents a transaction; key is set to index to help React track items */}
                <td>{t.date}</td>
                {/* Display transaction date */}
                <td>{t.amount}</td>
                {/* Display transaction amount */}
                <td>{t.property}</td>
                {/* Display property associated with transaction */}
              </tr>
            ))
          ) : (
            // If there are no transactions, show a single row indicating empty state
            <tr>
              <td colSpan="3" style={{ textAlign: "center", padding: "20px" }}>
                No transactions found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TransactionTable; 
// Export the TransactionTable component so it can be imported and used in other files
