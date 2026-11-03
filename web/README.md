# ChurnGuard Dashboard

ChurnGuard is a web dashboard for telecom customer retention. It has two pages:

- **At-Risk Customers** lists the active customers most likely to churn, shows the top reasons behind each score, and generates a retention email for any customer.
- **Model Metrics** shows how the churn model performs on test data.

## Run it locally

The dashboard requires the Flask API to be running at <http://localhost:5000>. From the project root, start it with:

```
python api/app.py
```

Then, inside the `web/` folder, create a file named `.env.local` with this line if you do not have one yet:

```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

Install the dependencies and start the dashboard, also inside the `web/` folder:

```
npm install
npm run dev
```

Open <http://localhost:3000> in your browser.
