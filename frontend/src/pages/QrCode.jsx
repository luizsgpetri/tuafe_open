import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Row, Spinner } from 'react-bootstrap';
import { QRCodeCanvas } from 'qrcode.react';
import { useParams } from 'react-router-dom';
import { fetchInvite } from '../api.js';

/**
 * Invitation QR code for one church. Scanning it opens the join form for that
 * same church, which is why the token is what gets encoded.
 */
const QrCode = () => {
  const { token } = useParams();
  const [church, setChurch] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const joinUrl = `${window.location.origin}/join/${token}`;

  useEffect(() => {
    fetchInvite(token)
      .then(({ data }) => setChurch(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(joinUrl);
    setCopied(true);
  };

  if (loading) {
    return <Spinner animation="border" />;
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  return (
    <Row className="justify-content-center">
      <Col md={8} lg={6}>
        <Card className="shadow-sm text-center">
          <Card.Body className="p-4">
            <h1 className="h4">{church.name}</h1>
            <p className="text-muted">
              Scan this code to join the church. It opens a page asking only for an email address.
            </p>

            <div className="qr-frame my-3">
              <QRCodeCanvas value={joinUrl} size={240} includeMargin />
            </div>

            <p className="small text-break text-muted">{joinUrl}</p>

            <div className="d-flex gap-2 justify-content-center">
              <Button variant="outline-secondary" onClick={handleCopy}>
                {copied ? 'Link copied' : 'Copy invitation link'}
              </Button>
              <Button variant="outline-secondary" onClick={() => window.print()}>
                Print
              </Button>
            </div>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default QrCode;
