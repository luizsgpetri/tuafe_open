import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { Link, useParams } from 'react-router-dom';
import { fetchInvite, joinChurch } from '../api.js';

/**
 * Destination of the invitation QR code: one field, one button, no account
 * needed. The church is identified by the token in the URL.
 */
const Join = () => {
  const { token } = useParams();
  const [church, setChurch] = useState(null);
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchInvite(token)
      .then(({ data }) => setChurch(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const { data } = await joinChurch(token, email);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Spinner animation="border" />;
  }

  if (!church) {
    return <Alert variant="danger">{error || 'This invitation link is not valid.'}</Alert>;
  }

  return (
    <Row className="justify-content-center">
      <Col md={7} lg={5}>
        <Card className="shadow-sm">
          <Card.Body className="p-4">
            <h1 className="h4 mb-1">Join {church.name}</h1>
            <p className="text-muted small">{church.description}</p>

            {result ? (
              <>
                <Alert variant="success">
                  {result.alreadyMember
                    ? `${result.member.email} is already a member of ${result.church.name}.`
                    : `${result.member.email} is now a member of ${result.church.name}.`}
                </Alert>
                <Button as={Link} to={`/church/${token}`} variant="outline-primary">
                  See the church profile
                </Button>
              </>
            ) : (
              <>
                {error && <Alert variant="danger">{error}</Alert>}
                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3" controlId="email">
                    <Form.Label>Your email address</Form.Label>
                    <Form.Control
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      required
                    />
                  </Form.Group>
                  <Button type="submit" variant="primary" className="w-100" disabled={submitting}>
                    {submitting ? <Spinner animation="border" size="sm" /> : 'Join the church'}
                  </Button>
                </Form>
              </>
            )}
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default Join;
